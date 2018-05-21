import {Node, Blockchain} from './index.js';
import global from "consts/global.js";

//Blockchain.createBlockchain("headers-node");
Blockchain.createBlockchain("light-node", ()=>{
    Node.NodeClientsService.startService();
    Node.NodeWebPeersService.startService();
});

window.onbeforeunload = () => {
    console.warn("SIGINT FIRED")
    global.TERMINATED = true;

    setInterval(()=>{
        if ( global.MINIBLOCKCHAIN_LIGHT_CONFIGURATION_SAVED &&
            global.SEMAPHORE_PROCESS_DONE &&
            global.MINIBLOCKCHAIN_LIGHT_SAVED &&
            global.MINIBLOCKCHAIN_ADVANCED_SAVED &&
            global.MINIBLOCKCHAIN_SAVED &&
            global.INTERFACE_BLOCKCHAIN_SAVED) {

            console.log(global.MINIBLOCKCHAIN_LIGHT_CONFIGURATION_SAVED);
            console.log(global.SEMAPHORE_PROCESS_DONE);
            console.log(global.MINIBLOCKCHAIN_LIGHT_SAVED);

            console.warn("process.exit(0)");
        }
    }, 100)
}

