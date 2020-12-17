(()=> {
    let x  = (innerApi,_hashBin128="")=>{
        let aes = {decrypt: false, encrypt: false};
        if (typeof hashBin128 === 'undefined') var hashBin128 = _hashBin128;
        const routeApiInput = (message,ws)=>{
            if (aes.decrypt) message = aes.decrypt(message)
            //console.log("api in: "+message);
            let income = JSON.parse(message)
            let incomeKeys = Object.keys(income);
            let retCb;
            for (let k in innerApi) {
                if (-1 !== incomeKeys.indexOf(k)) {
                    if (income.cb !== undefined) {
                        retCb = innerApi[k](ws, ...income[k]);
                        if (retCb instanceof Promise) {
                            retCb.then((ret) => {
                                ws.api.cbe(income.cb, ret);
                            })
                        } else {
                            ws.api.cbe(income.cb, retCb);
                        }
                    } else {
                        innerApi[k](ws, ...income[k]);
                    }
                    break; // only one cmd
                }
            }
            if (income.cbe !== undefined) ws.api.clbs(...income.cbe);
        }
        const routeApiOutput = (ws) => new Proxy((()=>{
            return {
                clbs: {},
                proxy: this,
                ws: ws,
                await: false
            }
        })(), {
            get: (target,thisArg)=>{
                if (thisArg === 'aes') {
                    // sets messages transform func
                    return (mode,func)=> {
                        if (mode == 'encrypt') aes.encrypt = func;
                        if (mode == 'decrypt') aes.decrypt = func;
                    }
                } else if (thisArg === 'await') {
                    //next call be await
                    target.await = true;
                    return target.ws.api
                } else if (thisArg === 'clbs') {
                    return function(cbn,cbr){
                        if (target.clbs[cbn] !== undefined) {
                            //console.log("Do callback cbn",cbr)
                            target.clbs[cbn](cbr);
                            delete target.clbs[cbn];
                        }
                    }
                } else {
                    return function () {
                        let args = [];
                        for (let i = 0; i < arguments.length; i++) args[i] = arguments[i];
                        console.log(thisArg,args)
                        let argumentsL = {}
                        if (thisArg === 'cbe') {
                            //callback send answer
                            argumentsL[thisArg] = args;
                            let data = JSON.stringify(argumentsL);
                            if (aes.encrypt) data = aes.encrypt(data)
                            target.ws.send(data);
                            return true;
                        }
                        let delayPromise
                        if (target.await) {
                            let uniqueCbBinCode = hashBin128();
                            argumentsL['cb'] = uniqueCbBinCode;
                            delayPromise = new Promise((resolve, reject) => {
                                target.clbs[uniqueCbBinCode] = resolve;
                            })
                        }
                        argumentsL[thisArg] = args;
                        let data = JSON.stringify(argumentsL);
                        if (aes.encrypt) data = aes.encrypt(data)
                        target.ws.send(data);

                        if (target.await) {
                            target.await = false;
                            return delayPromise;
                        }
                    }
                }
            }
        })
        return {routeApiInput,routeApiOutput}
    }
    if (typeof exports !== 'undefined') module.exports = x
    else ioLib = x
})();
