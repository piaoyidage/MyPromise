function resolvePromise(promise2, x, resolve, reject) {
    if (promise2 === x) {
        return reject(new TypeError('循环引用'))
    }
    let called = false
    if (x !== null && (typeof x === 'function' || typeof x === 'object')) {
        try {
            const { then } = x
            if (typeof then === 'function') {
                then.call(x, y => {
                    if (called) {
                        return
                    }
                    called = true
                    resolvePromise(promise2, y, resolve, reject)
                }, error => {
                    if (called) {
                        return
                    }
                    called = true
                    reject(error)
                })
            } else {
                resolve(x)
            }
        } catch (e) {
            if (called) {
                return
            }
            called = true
            reject(e)
        }
    } else {
        resolve(x)
    }
}


class MyPromise {
    // executor = (resolve, reject) => {
    //     ...具体业务逻辑
    //     if (...) {
    //         resolve(data)
    //     }
    //
    //     if (...) {
    //         reject(reason)
    //     }
    // }
    constructor(executor) {
        // 状态 Pending/Fulfilled/Rejected
        this.status = 'Pending'
        this.value = undefined
        this.reason = undefined

        // 当resolve 在异步操作里，then 方法是 pending 状态
        this.onFulfilledCallbacks = []
        this.onRejectedCallbacks = []

        const resolve = value => {
            if (this.status === 'Pending') {
                this.status = 'Fulfilled'
                this.value = value

                this.onFulfilledCallbacks.forEach(fn => fn())
            }
        }

        const reject = reason => {
            if (this.status === 'Pending') {
                this.status = 'Rejected'
                this.reason = reason

                this.onRejectedCallbacks.forEach(fn => fn())
            }
        }

        try {
            executor(resolve, reject)
        } catch (e) {
            reject(e)
        }
    }

    // 返回一个 promise
    then(onFulfilled, onRejected) {
        // 判断传入的是不是 函数
        onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value
        onRejected = typeof onRejected === 'function' ? onRejected : error => { throw error }

        const promise2 = new MyPromise((resolve, reject) => {
            if (this.status === 'Fulfilled') {
                setTimeout(() => {
                    try {
                        const x = onFulfilled(this.value)
                        resolvePromise(promise2, x, resolve, reject)
                    } catch (e) {
                        reject(e)
                    }
                }, 0)
            }

            if (this.status === 'Rejected') {
                setTimeout(() => {
                    try {
                        const x = onRejected(this.reason)
                        resolvePromise(promise2, x, resolve, reject)
                    } catch (e) {
                        reject(e)
                    }
                }, 0)
            }

            if (this.status === 'Pending') {
                this.onFulfilledCallbacks.push(() => {
                    setTimeout(() => {
                        try {
                            const x = onFulfilled(this.value)
                            resolvePromise(promise2, x, resolve, reject)
                        } catch (e) {
                            reject(e)
                        }
                    }, 0)
                })

                this.onRejectedCallbacks.push(() => {
                    setTimeout(() => {
                        try {
                            const x = onRejected(this.reason)
                            resolvePromise(promise2, x, resolve, reject)
                        } catch (e) {
                            reject(e)
                        }
                    }, 0)
                })
            }
        })
        return promise2
    }

    catch(onRejected) {
        return this.then(null, onRejected)
    }
}

MyPromise.resolve = value => new MyPromise((onFulfilled, onRejectd) => { onFulfilled(value) })

MyPromise.reject = error => new MyPromise((onFulfilled, onRejectd) => { onRejectd(error) })

MyPromise.all = promises => {
    const resultArr = []
    let count = 0
    const processData = (i, data) => {
        resultArr[i] = data
        count += 1
        if (count === promises.length) {
            resolve(resultArr)
        }
    }
    return new MyPromise((resolve, reject) => {
        for (let i = 0; i < promises.length; i += 1) {
            promises[i].then(data => {
                processData(i, data)
            }, reject)
        }
    })
}

MyPromise.race = promises => (
    new MyPromise((resolve, reject) => {
        for (let i = 0; i < promises.length; i += 1) {
            promises[i].then(resolve, reject)
        }
    })
)

// 测试使用
MyPromise.defer = MyPromise.deferred = function () {
    const dfd = {}
    dfd.promise = new MyPromise((resolve, reject) => {
        dfd.resolve = resolve
        dfd.reject = reject
    })
    return dfd
}

module.exports = MyPromise
