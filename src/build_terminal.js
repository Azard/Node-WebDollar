import {Node, Blockchain} from './index.js';
import global from "consts/global.js";
import CLI from "node/menu/CLI-Menu";

console.log("TESTING MODE");

//                            light-node

Blockchain.createBlockchain("full-node", ()=>{
    Node.NodeClientsService.startService();
}, ()=>{
    Node.NodeServer.startServer();
});


process.on('SIGINT', function() {

    console.warn("SIGINT FIRED")
    global.TERMINATED = true;

    setInterval(()=>{
        if ( global.MINIBLOCKCHAIN_LIGHT_CONFIGURATION_SAVED &&
             global.SEMAPHORE_PROCESS_DONE &&
             global.MINIBLOCKCHAIN_LIGHT_SAVED) {

            console.log(global.MINIBLOCKCHAIN_LIGHT_CONFIGURATION_SAVED);
            console.log(global.SEMAPHORE_PROCESS_DONE);
            console.log(global.MINIBLOCKCHAIN_LIGHT_SAVED);

            console.warn("process.exit(0)");
            process.exit(0);
        }
    })

});