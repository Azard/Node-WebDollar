import PPoWBlockchainAgentFullNode from 'common/blockchain/ppow-blockchain/agents/PPoW-Blockchain-Agent-Full-Node'
import InterfaceBlockchainAgentFullNode from 'common/blockchain/interface-blockchain/agents/Interface-Blockchain-Agent-Full-Node'
import MiniBlockchainLightProtocol from "common/blockchain/mini-blockchain/protocol/light/Mini-Blockchain-Light-Protocol"
import MiniBlockchainForkLight from '../protocol/light/Mini-Blockchain-Light-Fork'
import consts from "consts/const_global";
import NodesList from 'node/lists/nodes-list';
import CONNECTION_TYPE from "node/lists/types/Connections-Type";
import Blockchain from "main-blockchain/Blockchain"
import AGENT_STATUS from "common/blockchain/interface-blockchain/agents/Agent-Status";

let inheritAgentClass;

if (consts.POPOW_PARAMS.ACTIVATED) inheritAgentClass = PPoWBlockchainAgentFullNode;
else  inheritAgentClass = InterfaceBlockchainAgentFullNode;

const WEBRTC_MINIMUM_LIGHT = 6;
const WEBRTC_MINIMUM_LIGHT_PROBABILITY = 1/WEBRTC_MINIMUM_LIGHT;

class MiniBlockchainAgentLightNode extends inheritAgentClass{

    constructor(blockchain){

        super(blockchain);

        this.light = true;

        setInterval( ()=>{

            if (this.blockchain.proofPi !== null)
                if ( new Date().getTime() - this.blockchain.proofPi.date.getTime() >= consts.BLOCKCHAIN.DIFFICULTY.TIME_PER_BLOCK *1000 * 2)

                    if ( Math.random() < WEBRTC_MINIMUM_LIGHT_PROBABILITY && this.status === AGENT_STATUS.AGENT_STATUS_SYNCHRONIZED_WEBRTC  )
                        Blockchain.synchronizeBlockchain(); //let's synchronize again

        }, (consts.BLOCKCHAIN.DIFFICULTY.TIME_PER_BLOCK - 10) * 1000);
    }


    newFork(){
        let fork = new MiniBlockchainForkLight();
        MiniBlockchainForkLight.prototype.initializeConstructor.apply(fork, arguments);

        return fork;
    }

    _newProtocol(){
        this.protocol = new MiniBlockchainLightProtocol(this.blockchain, this);
    }


    initializeStartAgentOnce(){

        this._initializeProtocol();

        NodesList.emitter.on("nodes-list/disconnected", async (result) => {



            if ( NodesList.countNodesByConnectionType(CONNECTION_TYPE.CONNECTION_WEBRTC) < 3)
                Blockchain.synchronizeBlockchain(); //let's synchronize again

        });

        NodesList.emitter.on("nodes-list/connected", async (result) => {

            if ( NodesList.countNodesByConnectionType(CONNECTION_TYPE.CONNECTION_WEBRTC) > WEBRTC_MINIMUM_LIGHT) {
                //let's disconnect from full nodes

                if ( this.status !== AGENT_STATUS.AGENT_STATUS_SYNCHRONIZED_WEBRTC ) {

                    this.status = AGENT_STATUS.AGENT_STATUS_SYNCHRONIZED_WEBRTC;

                    if (Math.random() > WEBRTC_MINIMUM_LIGHT_PROBABILITY) // most will disconnect from full nodes
                        for (let i=NodesList.nodes.length-1; i>=0; i--)
                            if ( NodesList.nodes[i].connectionType === CONNECTION_TYPE.CONNECTION_CLIENT_SOCKET ){
                                NodesList.nodes[i].socket.disconnect();
                            }

                }
            }

        });
    }

}

export default MiniBlockchainAgentLightNode;