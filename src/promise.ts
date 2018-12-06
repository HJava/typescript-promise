/**
* @module promise
* @author: Hjava
* @description: 一个简单的TypeScript Promise库
* @description: a simple TypeScript Promise Library
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

if (global.MutationObserver) {
    let observer = new MutationObserver((mutationList) => {
        for (let mutation of mutationList) {
            if (mutation.type === 'attributes') {
                let id = document.getElementsByTagName('body')[0].getAttribute('promise-' + randomId);
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
        }
    });

    observer.observe(document.getElementsByTagName('body')[0], {attributes: true});
}

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
    if (global.MutationObserver) {
        functionStorage[++index] = func;
        document.getElementsByTagName('body')[0].setAttribute('promise-' + randomId, index + '');
    } else if (global.setImmediate) {
        global.setImmediate(func);
    } else if (global.postMessage) {
        functionStorage[++index] = func;
        global.postMessage(index, '*')
    } else {
        setTimeout(func);
    }
}

export default class Promise {
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
        if (Promise._d !== 1) {
            throw TypeError();
        }

        if (value instanceof Promise) {
            return value;
        }

        return new Promise((resolve) => {
            resolve(value);
        });
    }

    public static reject(value?) {
        if (Promise._d !== 1) {
            throw TypeError();
        }

        return new Promise((resolve, reject) => {
            reject(value);
        });
    }

    public static all(arr) {
        if (Promise._d !== 1) {
            throw TypeError();
        }

        if (!(arr instanceof Array)) {
            return Promise.reject(new TypeError());
        }

        let promise = new Promise();;

        function done() {
            // 统计还有多少未完成的Promise
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
        if (Promise._d !== 1) {
            throw TypeError();
        }

        if (!(arr instanceof Array)) {
            return Promise.reject(new TypeError());
        }

        let promise = new Promise();

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
        if (Promise._d !== 1) {
            throw TypeError();
        }

        let promise = new Promise();
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
     * 用于处理异步调用情况。首先需要判断传入的value是否为另一个Promise，如果是则需要判断传入Promise情况，通过循环调用解决传入Promise问题；如果不是则直接处理异步逻辑
     * handle the 
     * 
     * @private
     * @memberof Promise
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
            // 在原有Promise后增加一个then函数用来判断原有promise的状态

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
                this._finishThisPromise();
            }
    
            // if promise === x, use TypeError to reject promise
            // 如果promise和x指向同一个对象，那么用TypeError作为原因拒绝promise
            if (this._value === this) {
                this.state = State.rejecting;
                this._reason = new TypeError();
                this._value = void 0;
            }
    
            this._finishThisPromise();
        }
    }

    private _finishThisPromise() {
        if (this.state === State.resolving) {
            this.state = State.resolved;

            this._next.map((nextPromise) => {
                nextPromise.resolve(this._value);
            });
        } else {
            this.state = State.rejected;

            this._next.map((nextPromise) => {
                nextPromise.reject(this._reason);
            });
        }
    }
}

// 在严格模式下返回undefined，在宽松模式下返回global
// return undefined when strict mode, and return global when sloppy mode
function getThis() {
    return this;
}