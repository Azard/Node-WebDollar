import NodeClient from 'node/sockets/node-clients/socket/Node-Client'
import NodesList from 'node/lists/nodes-list'
import NodesWaitlistObject from './nodes-waitlist-object';
import SocketAddress from 'common/sockets/socket-address'
import consts from 'consts/const_global'
import NodesType from "node/lists/types/Nodes-Type"
import CONNECTION_TYPE from "../types/Connections-Type";

const EventEmitter = require('events');

class NodesWaitlist {

    constructor(){

        console.log("NodesWaitlist constructor");

        this.NodesWaitlistObject = NodesWaitlistObject;

        this.emitter = new EventEmitter();
        this.emitter.setMaxListeners(100);

        this.waitListFullNodes = [];
        this.waitListLightNodes = [];

        this.started = false;

        this._connectedQueue = [];

        this.MAX_FULLNODE_WAITLIST_CONNECTIONS = 500;
        this.MAX_LIGHTNODE_WAITLIST_CONNECTIONS = 500;
        this.MAX_ERROR_TRIALS = 100;

    }


    startConnecting(){

        if (this.started)  return;

        this.started = true;
        this._connectNewNodesWaitlistInterval();

    }

    addNewNodeToWaitlist(addresses, port, type, nodeConnected, level, backedBy){

        if ( (typeof addresses === "string" && addresses === '') || (typeof addresses === "object" && (addresses === null || addresses===[])) ) return false;
        if ( typeof addresses === "string" || !Array.isArray(addresses) ) addresses = [addresses];

        let sckAddresses = [];

        for (let i=0; i<addresses.length; i++){

            let sckAddress = SocketAddress.createSocketAddress(addresses[i], port);

            if (backedBy !==  "fallback") {

                let foundWaitList = this._searchNodesWaitlist(sckAddress, port, type);

                if (foundWaitList !== null)foundWaitList.pushBackedBy(backedBy);
                else sckAddresses.push(sckAddress);

            } else
                sckAddresses.push(sckAddress);

        }

        if (sckAddresses.length > 0){

            let waitListObject = new NodesWaitlistObject( sckAddresses, type, nodeConnected, level, backedBy );

            if (waitListObject.type === NodesType.NODE_TERMINAL)  this.waitListFullNodes.push(waitListObject);
            else  if (waitListObject.type === NodesType.NODE_WEB_PEER) this.waitListLightNodes.push(waitListObject);

            this.emitter.emit("waitlist/new-node", waitListObject);
            return waitListObject;

        }
        
        return null;
    }

    _findNodesWaitlist(address, port, listType){

        let list = [];

        let sckAddress = SocketAddress.createSocketAddress( address, port );

        if (listType === NodesType.NODE_TERMINAL )  list = this.waitListFullNodes;
        else if( listType === NodesType.NODE_WEB_PEER ) list = this.waitListLightNodes;

        for (let i=0; i<list.length; i++)
            for (let j=0; j<list[i].sckAddresses.length; j++)
                if (list[i].sckAddresses[j].matchAddress(sckAddress) )
                    return i;

        return -1;

    }

    _searchNodesWaitlist(address, port, listType ){

        let list = [];

        if (listType === NodesType.NODE_TERMINAL ) list = this.waitListFullNodes;
        else if( listType === NodesType.NODE_WEB_PEER ) list = this.waitListLightNodes;

        let index = this._findNodesWaitlist(address, port, listType);

        if (index === -1) return null;

        return list[index];

    }

    /*
        Connect to all nodes
    */
    _connectNewNodesWaitlist(){

        this._deleteUselessWaitlist(NodesType.NODE_TERMINAL);

        if (NodesList.countNodes(CONNECTION_TYPE.CONNECTION_CLIENT_SOCKET) === 0){

            for (let i=0; i < this.waitListFullNodes.length; i++)
                if ( this.waitListFullNodes[i].findBackedBy("fallback") !== null)
                    this._tryToConnectNextNode(this.waitListFullNodes[i]);

        } else {

            for (let i=0; i < this.waitListFullNodes.length; i++)
                this._tryToConnectNextNode(this.waitListFullNodes[i]);

        }

    }

    _connectNewNodesWaitlistInterval(){

        this._connectNewNodesWaitlist();

        setTimeout( this._connectNewNodesWaitlistInterval.bind(this), consts.SETTINGS.PARAMS.WAITLIST.INTERVAL);
    }

    _tryToConnectNextNode(nextWaitListObject){

        if ( process.env.BROWSER && (this._connectedQueue.length + NodesList.countNodes(CONNECTION_TYPE.CONNECTION_CLIENT_SOCKET)) > consts.SETTINGS.PARAMS.CONNECTIONS.SOCKETS.MAXIMUM_CONNECTIONS_IN_BROWSER ) return;
        if ( !process.env.BROWSER && (this._connectedQueue.length + NodesList.countNodes(CONNECTION_TYPE.CONNECTION_CLIENT_SOCKET)) > consts.SETTINGS.PARAMS.CONNECTIONS.SOCKETS.MAXIMUM_CONNECTIONS_IN_TERMINAL ) return;

        //connect only to TERMINAL NODES
        if ( nextWaitListObject.type === NodesType.NODE_TERMINAL) {

            if (nextWaitListObject.checkLastTimeChecked(consts.SETTINGS.PARAMS.WAITLIST.TRY_RECONNECT_AGAIN) && nextWaitListObject.blocked === false &&
                nextWaitListObject.connecting === false && nextWaitListObject.checkIsConnected() === null) {

                nextWaitListObject.blocked = true;
                this._connectedQueue.push(nextWaitListObject);

                this._connectNowToNewNode(nextWaitListObject).then((connected) => {

                    for (let i=0; i<this._connectedQueue.length; i++)
                        if (this._connectedQueue[i] === nextWaitListObject){
                            this._connectedQueue.splice(i,1);
                        }

                    nextWaitListObject.checked = true;
                    nextWaitListObject.blocked = false;
                    nextWaitListObject.connected = connected;
                    nextWaitListObject.refreshLastTimeChecked();

                });

            }

        }
    }

    async _connectNowToNewNode(nextWaitListObject){

        nextWaitListObject.connecting = true;

        //trying to connect to each sckAddresses

        let index = Math.floor( Math.random() * nextWaitListObject.sckAddresses.length );

        //search if the new protocol was already connected in the past
        let nodeClient = NodesList.searchNodeSocketByAddress(nextWaitListObject.sckAddresses[index], 'all', ["id","uuid"]);
        if (nodeClient !== null) return nodeClient;

        if (nextWaitListObject.socket !== null) nodeClient = nextWaitListObject.socket;
        else nodeClient = new NodeClient();

        try {
            let answer = await nodeClient.connectTo(nextWaitListObject.sckAddresses[index], undefined, nextWaitListObject.level+1);

            if (answer) nextWaitListObject.socketConnected(nodeClient);
            else nextWaitListObject.socketErrorConnected();

            nextWaitListObject.connecting = false;
            return answer;
        }
        catch (Exception) {
            console.log("Error connecting to new protocol waitlist", Exception)
        }

        nextWaitListObject.connecting = false;
        return false;
    }

    /**
     * It will delete useless waitlist WEB_PEER
     * It will delete addresses that tried way too much
     * @returns {boolean}
     */
    _deleteUselessWaitlist(listType){

        let list = [];

        if (listType === NodesType.NODE_TERMINAL )
            list = this.waitListFullNodes;
        else if (listType === NodesType.NODE_WEB_PEER )
            list = this.waitListLightNodes;

        for (let i=list.length-1; i>=0; i--) {

            if ( list[i].errorTrial > this.MAX_ERROR_TRIALS ) {

                this.emitter.emit("waitlist/delete-node", list[i]);
                list.splice(i, 1);

            }

        }


        if (listType === NodesType.NODE_TERMINAL )
            this.waitListFullNodes = list;

        else if (listType === NodesType.NODE_WEB_PEER )
            this.waitListFullNodes = list;

        return false;

    }

    removedWaitListElement(address, port, backedBy, listType){

        let list = [];

        if( listType === NodesType.NODE_TERMINAL)  list = this.waitListFullNodes;
        else if ( listType === NodesType.NODE_WEB_PEER ) list = this.waitListLightNodes;

        let index = this._findNodesWaitlist(address, port, listType);

        if (index !== -1) {

            list[index].removeBackedBy(backedBy);

            if ( list[index].backedBy.length === 0) {

                this.emitter.emit("waitlist/delete-node", list[index]);
                list.splice(index, 1);

            }

            if( listType === NodesType.NODE_TERMINAL) this.waitListFullNodes = list;
            else if ( listType === NodesType.NODE_WEB_PEER ) this.waitListLightNodes = list;

            return true;

        }

        return false;
    }

    resetWaitlist(listType){

        let list = [];

        if( listType === NodesType.NODE_TERMINAL)  list = this.waitListFullNodes;
        else if ( listType === NodesType.NODE_WEB_PEER ) list = this.waitListLightNodes;

        for (let i=0; i<list.length; i++)
            list[i].resetWaitlistNode();

        if( listType === NodesType.NODE_TERMINAL) this.waitListFullNodes = list;
        else if ( listType === NodesType.NODE_WEB_PEER ) this.waitListLightNodes = list;

    }

}


export default new NodesWaitlist();