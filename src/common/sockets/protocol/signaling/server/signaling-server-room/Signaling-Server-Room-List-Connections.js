import SocketAddress from 'common/sockets/socket-address'
import SignalingServerRoomConnectionObject from './Signaling-Server-Room-Connection-Object';
import NodesList from 'node/lists/nodes-list'
import CONNECTIONS_TYPE from "node/lists/types/Connections-Type"
import NODES_TYPE from "node/lists/types/Nodes-Type"
/*
    The List is populated with Node Sockets who are available for WebRTC
 */

const uuid = require('uuid');

class SignalingServerRoomListConnections {

    // signalingRoom = []               - storing the connected sockets
    // events = []                      - used for callbacks

    constructor() {

        console.log("SignalingRoomList constructor");

        this.lastConnectionsId = 0;

        this.list = [];

        //{type: ["webpeer", "client"]}
        NodesList.emitter.on("nodes-list/disconnected", (result ) => { this._disconnectedNode( result ) });
    }

    registerSignalingServerRoomConnection(client1, client2, status) {

        if (client1 === null || client2 === null)
            return null;

        let connection = this.searchSignalingServerRoomConnection(client1, client2);

        if (connection === null) {

            let roomConnectionObject = new SignalingServerRoomConnectionObject(client1, client2, status, uuid.v4());

            this.list.push(roomConnectionObject);
            this.list.push(roomConnectionObject);

            return roomConnectionObject;

        } else {
            //it was established before, now I only change the status
            connection.status = status;
        }

        return connection;
    }

    searchSignalingServerRoomConnection(client1, client2, skipReverse) {

        //previous established connection
        for (let i = 0; i < this.list.length; i++)
            if ((this.list[i].client1 === client1 && this.list[i].client2 === client2) || (this.list[i].client1 === client2 && this.list[i].client2 === client1)) {

                return this.list[i];

            }

        if ( skipReverse === undefined || skipReverse === false)
            return this.searchSignalingServerRoomConnection(client2, client1, true);

        return null;
    }

    searchSignalingServerRoomConnectionById(id){

        for (let i = 0; i < this.list.length; i++)
            if (this.list[i].id === id)
                return this.list[i];

        return null;
    }

    _disconnectedNode(nodesListObject){

        if ( [ CONNECTIONS_TYPE.CONNECTION_CLIENT_SOCKET, CONNECTIONS_TYPE.CONNECTION_WEBRTC].indexOf(nodesListObject.connectionType) )    // signaling service on webpeer

            for (let i = this.list.length-1; i >= 0 ; i--)
                if (this.list[i].client1 === nodesListObject.socket || this.list[i].client2 === nodesListObject.socket){
                    this.list.splice(i, 1);
                }

    }

    removeServerRoomConnection( connection ) {

        for (let i=0; this.list.length; i++)
            if ( this.list[i].id === connection.id ){
                this.list.splice(i,1);
                return;
            }

    }


}

export default new SignalingServerRoomListConnections();