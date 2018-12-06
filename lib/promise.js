"use strict";
/**
* @module promise
* @author: Hjava
* @description: 一个简单的TypeScript TypeScriptPromise库
* @description: a simple TypeScript TypeScriptPromise Library
* @since: 2018-11-23 15:00:38
*/
exports.__esModule = true;
var State;
(function (State) {
    State[State["pending"] = 0] = "pending";
    State[State["resolving"] = 1] = "resolving";
    State[State["rejecting"] = 2] = "rejecting";
    State[State["resolved"] = 3] = "resolved";
    State[State["rejected"] = 4] = "rejected";
})(State || (State = {}));
;
var index = 0;
var randomId = Math.floor(Math.random() * 1000000);
var functionStorage = {};
var isRunningTask = false;
if (global.postMessage) {
    global.addEventListener('message', function (e) {
        if (e.source === global) {
            var id = e.data;
            if (isRunningTask) {
                nextTick(functionStorage[id]);
            }
            else {
                isRunningTask = true;
                try {
                    functionStorage[id]();
                }
                catch (e) {
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
    }
    else if (global.postMessage) {
        functionStorage[++index] = func;
        global.postMessage(index, '*');
    }
    else {
        setTimeout(func);
    }
}
var TypeScriptPromise = /** @class */ (function () {
    function TypeScriptPromise(resolver) {
        this._next = [];
        this.state = 0;
        if (typeof resolver !== 'function' && resolver !== undefined) {
            throw TypeError();
        }
        if (typeof this !== 'object') {
            throw TypeError();
        }
        try {
            if (typeof resolver === 'function') {
                resolver(this.resolve.bind(this), this.reject.bind(this));
            }
        }
        catch (e) {
            this.reject(e);
        }
    }
    TypeScriptPromise.resolve = function (value) {
        if (TypeScriptPromise._d !== 1) {
            throw TypeError();
        }
        if (value instanceof TypeScriptPromise) {
            return value;
        }
        return new TypeScriptPromise(function (resolve) {
            resolve(value);
        });
    };
    TypeScriptPromise.reject = function (value) {
        if (TypeScriptPromise._d !== 1) {
            throw TypeError();
        }
        return new TypeScriptPromise(function (resolve, reject) {
            reject(value);
        });
    };
    TypeScriptPromise.all = function (arr) {
        if (TypeScriptPromise._d !== 1) {
            throw TypeError();
        }
        if (!(arr instanceof Array)) {
            return TypeScriptPromise.reject(new TypeError());
        }
        var promise = new TypeScriptPromise();
        ;
        function done() {
            // 统计还有多少未完成的TypeScriptPromise
            // count the unresolved promise
            var unresolvedNumber = arr.filter(function (element) {
                return element && element.then;
            }).length;
            if (!unresolvedNumber) {
                promise.resolve(arr);
            }
            arr.map(function (element, index) {
                if (element && element.then) {
                    element.then(function (value) {
                        arr[index] = value;
                        done();
                        return value;
                    });
                }
            });
        }
        done();
        return promise;
    };
    TypeScriptPromise.race = function (arr) {
        if (TypeScriptPromise._d !== 1) {
            throw TypeError();
        }
        if (!(arr instanceof Array)) {
            return TypeScriptPromise.reject(new TypeError());
        }
        var promise = new TypeScriptPromise();
        function done(value) {
            if (value) {
                promise.resolve(value);
            }
            var unresolvedNumber = arr.filter(function (element) {
                return element && element.then;
            }).length;
            if (!unresolvedNumber) {
                promise.resolve(arr);
            }
            arr.map(function (element, index) {
                if (element && element.then) {
                    element.then(function (value) {
                        arr[index] = value;
                        done(value);
                        return value;
                    });
                }
            });
        }
        done();
        return promise;
    };
    TypeScriptPromise.prototype.resolve = function (value) {
        if (this.state === State.pending) {
            this._value = value;
            this.state = State.resolving;
            nextTick(this._handleNextTick.bind(this));
        }
        return this;
    };
    TypeScriptPromise.prototype.reject = function (reason) {
        if (this.state === State.pending) {
            this._reason = reason;
            this.state = State.rejecting;
            this._value = void 0;
            nextTick(this._handleNextTick.bind(this));
        }
        return this;
    };
    TypeScriptPromise.prototype.then = function (fn, er) {
        if (TypeScriptPromise._d !== 1) {
            throw TypeError();
        }
        var promise = new TypeScriptPromise();
        promise.fn = fn;
        promise.er = er;
        if (this.state === State.resolved) {
            promise.resolve(this._value);
        }
        else if (this.state === State.rejected) {
            promise.reject(this._reason);
        }
        else {
            this._next.push(promise);
        }
        return promise;
    };
    TypeScriptPromise.prototype["catch"] = function (er) {
        return this.then(null, er);
    };
    /**
     * 用于处理异步调用情况。首先需要判断传入的value是否为另一个TypeScriptPromise，如果是则需要判断传入TypeScriptPromise情况，通过循环调用解决传入TypeScriptPromise问题；如果不是则直接处理异步逻辑
     * handle the
     *
     * @private
     * @memberof TypeScriptPromise
     */
    TypeScriptPromise.prototype._handleNextTick = function () {
        var _this = this;
        var ref;
        var count = 0;
        try {
            // 判断传入的this._value是否为一个thanable
            // check if this._value a thenable
            ref = this._value && this._value.then;
        }
        catch (e) {
            this.state = State.rejecting;
            this._reason = e;
            this._value = void 0;
            return this._handleNextTick();
        }
        if (this.state !== State.rejecting && (typeof this._value === 'object' || typeof this._value === 'function') && typeof ref === 'function') {
            // add a then function to get the status of the promise
            // 在原有TypeScriptPromise后增加一个then函数用来判断原有promise的状态
            try {
                ref.call(this._value, function (value) {
                    if (count++) {
                        return;
                    }
                    _this._value = value;
                    _this.state = State.resolving;
                    _this._handleNextTick();
                }, function (reason) {
                    if (count++) {
                        return;
                    }
                    _this._reason = reason;
                    _this.state = State.rejecting;
                    _this._value = void 0;
                    _this._handleNextTick();
                });
            }
            catch (e) {
                this.state = State.rejecting;
                this._reason = e;
                this._value = void 0;
                this._handleNextTick();
            }
        }
        else {
            try {
                if (this.state === State.resolving && typeof this.fn === 'function') {
                    this._value = this.fn.call(getThis(), this._value);
                }
                else if (this.state === State.rejecting && typeof this.er === 'function') {
                    this._value = this.er.call(getThis(), this._reason);
                    this.state = 1;
                }
            }
            catch (e) {
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
    };
    TypeScriptPromise.prototype._finishThisTypeScriptPromise = function () {
        var _this = this;
        if (this.state === State.resolving) {
            this.state = State.resolved;
            this._next.map(function (nextTypeScriptPromise) {
                nextTypeScriptPromise.resolve(_this._value);
            });
        }
        else {
            this.state = State.rejected;
            this._next.map(function (nextTypeScriptPromise) {
                nextTypeScriptPromise.reject(_this._reason);
            });
        }
    };
    TypeScriptPromise._d = 1;
    return TypeScriptPromise;
}());
exports["default"] = TypeScriptPromise;
// 在严格模式下返回undefined，在宽松模式下返回global
// return undefined when strict mode, and return global when sloppy mode
function getThis() {
    return this;
}
