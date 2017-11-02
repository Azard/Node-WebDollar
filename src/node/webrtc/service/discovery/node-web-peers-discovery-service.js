import {NodeWebPeer} from '../../web_peer/node-web-peer.js';
import {nodeProtocol, nodeFallBackInterval} from '../../../../consts/const_global.js';
import {NodeWebPeersService} from '../node-web-peers-service.js';
import {NodesWaitlist} from '../../../lists/waitlist/nodes-waitlist.js';
import {NodesList} from '../../../lists/nodes-list';

class NodeWebPeersDiscoveryService {

    constructor(){

        console.log("NodeWebPeersDiscoveryService constructor");

    }

    startDiscovery(){

        //if a new client || or || web peer is established then, I should register for accepting WebPeer connections
        NodesList.registerEvent("connected", {type: ["webpeer", "client"]}, (err, result) => { this.newSocketRegisterAcceptWebPeers(err, result) } );

    }

    newSocketRegisterAcceptWebPeers(err, nodesListObject){

        if (nodesListObject.type === "webpeer" || nodesListObject.type === "client") {

            let params = {};

            //client Signaling for WebRTC
            nodesListObject.socket.node.protocol.signaling.client.initializeSignalingClientService(params);

        }

    }

}

exports.NodeWebPeersDiscoveryService = new NodeWebPeersDiscoveryService();
