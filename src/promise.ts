/**
* @module promise
* @author: Hjava
* @description: 一个简单的TypeScript TypeScriptPromise库
* @description: a simple TypeScript TypeScriptPromise Library
* @since: 2018-11-23 15:00:38
*/

enum State {
    pending = 0,
    resolving = 1,
    rejecting = 2,
    resolved = 3,
    rejected = 4
};

let index: number = 0;
let randomId = Math.floor(Math.random() * 1000000);
let functionStorage = {};
let isRunningTask = false;

if (global.postMessage) {
    global.addEventListener('message', (e) => {
        if (e.source === global) {
            let id = e.data;
            if (isRunningTask) {
                nextTick(functionStorage[id]);
            } else {
                isRunningTask = true;

                try {
                    functionStorage[id]();
                } catch (e) {

                }
                isRunningTask = false;
            }

            delete functionStorage[id];
            functionStorage[id] = void 0;
        }
    });
}

function nextTick(func) {
    if (global.setImmediate) {
        global.setImmediate(func);
    } else if (global.postMessage) {
        functionStorage[++index] = func;
        global.postMessage(index, '*')
    } else {
        setTimeout(func);
    }
}

export default class TypeScriptPromise {
    public static _d = 1;

    private _value;
    private _reason;
    private _next = [];
    public state: State = 0;
    public fn;
    public er;


    constructor(resolver?) {
        if (typeof resolver !== 'function' && resolver !== undefined) {
            throw TypeError()
        }


        if (typeof this !== 'object') {
            throw TypeError()
        }

        try {
            if (typeof resolver === 'function') {
                resolver(this.resolve.bind(this), this.reject.bind(this));
            }
        } catch (e) {
            this.reject(e);
        }
    }

    public static resolve(value?) {
        if (TypeScriptPromise._d !== 1) {
            throw TypeError();
        }

        if (value instanceof TypeScriptPromise) {
            return value;
        }

        return new TypeScriptPromise((resolve) => {
            resolve(value);
        });
    }

    public static reject(value?) {
        if (TypeScriptPromise._d !== 1) {
            throw TypeError();
        }

        return new TypeScriptPromise((resolve, reject) => {
            reject(value);
        });
    }

    public static all(arr) {
        if (TypeScriptPromise._d !== 1) {
            throw TypeError();
        }

        if (!(arr instanceof Array)) {
            return TypeScriptPromise.reject(new TypeError());
        }

        let promise = new TypeScriptPromise();;

        function done() {
            // 统计还有多少未完成的TypeScriptPromise
            // count the unresolved promise
            let unresolvedNumber = arr.filter((element) => {
                return element && element.then;
            }).length;

            if (!unresolvedNumber) {
                promise.resolve(arr);
            }

            arr.map((element, index) => {
                if (element && element.then) {
                    element.then((value) => {
                        arr[index] = value;
                        done();
                        return value;
                    });
                }
            });
        }

        done();

        return promise;
    }

    public static race(arr) {
        if (TypeScriptPromise._d !== 1) {
            throw TypeError();
        }

        if (!(arr instanceof Array)) {
            return TypeScriptPromise.reject(new TypeError());
        }

        let promise = new TypeScriptPromise();

        function done(value?) {
            if (value) {
                promise.resolve(value);
            }

            let unresolvedNumber = arr.filter((element) => {
                return element && element.then;
            }).length;

            if (!unresolvedNumber) {
                promise.resolve(arr);
            }

            arr.map((element, index) => {
                if (element && element.then) {
                    element.then((value) => {
                        arr[index] = value;
                        done(value);
                        return value;
                    });
                }
            });
        }

        done();

        return promise;
    }

    resolve(value) {
        if (this.state === State.pending) {
            this._value = value;
            this.state = State.resolving;

            nextTick(this._handleNextTick.bind(this));
        }

        return this;
    }

    reject(reason) {
        if (this.state === State.pending) {
            this._reason = reason;
            this.state = State.rejecting;
            this._value = void 0;

            nextTick(this._handleNextTick.bind(this));
        }

        return this;
    }

    public then(fn, er?) {
        if (TypeScriptPromise._d !== 1) {
            throw TypeError();
        }

        let promise = new TypeScriptPromise();
        promise.fn = fn;
        promise.er = er;

        if (this.state === State.resolved) {
            promise.resolve(this._value);
        } else if (this.state === State.rejected) {
            promise.reject(this._reason);
        } else {
            this._next.push(promise);
        }

        return promise;
    }

    public catch(er) {
        return this.then(null, er);
    }


    /**
     * 用于处理异步调用情况。首先需要判断传入的value是否为另一个TypeScriptPromise，如果是则需要判断传入TypeScriptPromise情况，通过循环调用解决传入TypeScriptPromise问题；如果不是则直接处理异步逻辑
     * handle the 
     * 
     * @private
     * @memberof TypeScriptPromise
     */
    private _handleNextTick() {
        let ref;
        let count = 0;

        try {
            // 判断传入的this._value是否为一个thanable
            // check if this._value a thenable
            ref = this._value && this._value.then;
        } catch (e) {
            this.state = State.rejecting;
            this._reason = e;
            this._value = void 0;

            return this._handleNextTick();
        }

        if (this.state !== State.rejecting && (typeof this._value === 'object' || typeof this._value === 'function') && typeof ref === 'function') {
            // add a then function to get the status of the promise
            // 在原有TypeScriptPromise后增加一个then函数用来判断原有promise的状态

            try {
                ref.call(this._value, (value) => {
                    if (count++) {
                        return;
                    }

                    this._value = value;
                    this.state = State.resolving;
                    this._handleNextTick();
                }, (reason) => {
                    if (count++) {
                        return;
                    }

                    this._reason = reason;
                    this.state = State.rejecting;
                    this._value = void 0;
                    this._handleNextTick();
                });
            } catch (e) {
                this.state = State.rejecting;
                this._reason = e;
                this._value = void 0;
                this._handleNextTick();
            }
        } else {
            try {
                if (this.state === State.resolving && typeof this.fn === 'function') {
                    this._value = this.fn.call(getThis(), this._value);
                } else if (this.state === State.rejecting && typeof this.er === 'function') {
                    this._value = this.er.call(getThis(), this._reason);
                    this.state = 1;
                }
            } catch (e) {
                this.state = State.rejecting;
                this._reason = e;
                this._value = void 0;
                this._finishThisTypeScriptPromise();
            }

            // if promise === x, use TypeError to reject promise
            // 如果promise和x指向同一个对象，那么用TypeError作为原因拒绝promise
            if (this._value === this) {
                this.state = State.rejecting;
                this._reason = new TypeError();
                this._value = void 0;
            }

            this._finishThisTypeScriptPromise();
        }
    }

    private _finishThisTypeScriptPromise() {
        if (this.state === State.resolving) {
            this.state = State.resolved;

            this._next.map((nextTypeScriptPromise) => {
                nextTypeScriptPromise.resolve(this._value);
            });
        } else {
            this.state = State.rejected;

            this._next.map((nextTypeScriptPromise) => {
                nextTypeScriptPromise.reject(this._reason);
            });
        }
    }
}

// 在严格模式下返回undefined，在宽松模式下返回global
// return undefined when strict mode, and return global when sloppy mode
function getThis() {
    return this;
}
