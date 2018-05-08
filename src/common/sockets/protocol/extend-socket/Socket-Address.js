const ipaddr = require('ipaddr.js');
import consts from 'consts/const_global'
import GeoHelper from 'node/lists/geolocation-lists/geo-helpers/geo-helper'

class SocketAddress {

    static checkIsSocketAddress(sckAddress){

        if (typeof sckAddress !== 'object' || sckAddress === null) return false;

        if (! (sckAddress.constructor.name === "SocketAddress" )) return false;

        return true;
    }

    /*
        Create a Socket Address in case the address is just a simple "address"
     */
    static createSocketAddress(address, port, uuid){

        //in case address is actually a Socket
        if (typeof address === "object" && address !== null && address.hasOwnProperty("node") && address.node.hasOwnProperty("sckAddress"))
            address = address.node.sckAddress;

        if (typeof address === "object" && address !== null && address.hasOwnProperty("sckAddress"))
            address = address.sckAddress;

        if (SocketAddress.checkIsSocketAddress(address))
            return address;

        return new SocketAddress(address, port, uuid);
    }


    constructor(address, port, uuid){

        if (address === undefined) address = '';
        if (port === undefined) port = consts.SETTINGS.NODE.PORT;

        try {
            if (ipaddr.IPv6.isIPv6(address)) {

                let ip = ipaddr.IPv6.parse(address);

                if (ip.isIPv4MappedAddress()) // ip.toIPv4Address().toString() is IPv4
                    address = ip.toIPv4Address().toNormalizedString();
                else // ipString is IPv6
                    address = ip.toNormalizedString();

            }


            if (address.lastIndexOf(":") > 0) {//port
                port = address.substr(address.lastIndexOf(":") + 1);
                address = address.substr(0, address.lastIndexOf(":"));
            }

            if (ipaddr.IPv4.isIPv4(address)) {

                let ip = ipaddr.IPv4.parse(address);
                address = ip.toNormalizedString(); //IPv4

            } else {
            }// it is a domain

        } catch (exception){

            address = "0.0.0.0";

        }


        this.address = address; //always ipv6

        this.port = port;
        this._geoLocation = null;

        this.uuid = uuid;
    }

    matchAddress(address, validationDoubleConnectionsTypes){

        if (validationDoubleConnectionsTypes === undefined) validationDoubleConnectionsTypes = ["ip","uuid"];
        else
        if (!Array.isArray(validationDoubleConnectionsTypes))
            validationDoubleConnectionsTypes = [validationDoubleConnectionsTypes];

        //maybe it is a socket
        let sckAddress = SocketAddress.createSocketAddress(address);

        //uuid validation
        for (let i=0; i<validationDoubleConnectionsTypes.length; i++){

            if (validationDoubleConnectionsTypes[i] === "uuid") {
                if (this.uuid !== null && this.uuid !== undefined && this.uuid === sckAddress.uuid)
                    return true;
            }
            if (validationDoubleConnectionsTypes[i] === "ip") {
                if ( this.address === sckAddress.address ) return true;
            }
        }

        return false;
    }

    /*
        return nice looking ip addresses
     */
    toString(){
        return this.getAddress(false);
    }

    /*
        returns ipv6 ip standard
     */
    getAddress(includePort=true){

        return this.address + (includePort ? ':'+this.port : '');

    }

    get geoLocation(){

        if (this._geoLocation !== null) //already computed
            return this._geoLocation;

        this._geoLocation = new Promise( async (resolve)=>{

            let answer = await GeoHelper.getLocationFromAddress(this);

            if (answer === null) resolve(null);
            else {
                this._geoLocation = answer;
                resolve(answer);
            }

        });

        return this._geoLocation;

    }

    isLocalHost(){

        return false;

        try{

            let address = this.getAddress(false);

            if (address.indexOf("127.0.0.1") >= 0 || address.indexOf("localhost") >= 0)
                return true;

            if (address.indexOf("::1") >= 0)
                return true;

            if (address.indexOf("::") >= 0)
                return true;

            return false;

        } catch (Exception){
            throw {message: "EXCEPTION isLocalHost", address: this.address}
        }

    }

}

export default SocketAddress;