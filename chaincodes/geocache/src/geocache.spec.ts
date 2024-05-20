import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinon, { SinonStubbedInstance } from 'sinon'

import { Context } from 'fabric-contract-api'
import { ChaincodeStub, ClientIdentity } from 'fabric-shim'
import stringify from 'json-stringify-deterministic'
import sortKeys from 'sort-keys-recursive'

import { Geocache } from './geocache'
import { Cache } from './cache'
import { Trackable } from './trackable'
import { VisitLog } from './visitlog'

chai.use(chaiAsPromised)

class ContextMock implements Context {
  stub: SinonStubbedInstance<ChaincodeStub>
  clientIdentity: SinonStubbedInstance<ClientIdentity>
  logging: {
    setLevel: (level: string) => void
    getLogger: (name?: string) => any
  }

  constructor() {
    this.stub = sinon.createStubInstance(ChaincodeStub)
    this.clientIdentity = sinon.createStubInstance(ClientIdentity)
    this.logging = {
      setLevel: sinon.stub(),
      getLogger: sinon.stub(),
    }

    // Mock methods for user attributes
    this.clientIdentity.getID.returns('UserID-123'); // Mock User ID
    this.clientIdentity.getAttributeValue.withArgs('role').returns('user'); // Mock user role
  }
}

const userID = 'UserID-123'

describe('Geocache', () => {
    let contract: Geocache
    let ctx: ContextMock
    
    beforeEach(() => {
      contract = new Geocache()
      ctx = new ContextMock()
      ctx.stub.putState.resetHistory();
    })

    describe('Cache', () => {
        
        describe('Maintainer', () => {

            describe('UpdateCache', () => {
                
                    let mochCache: Cache = {
                        ID: 'cache1',
                        Name: 'Cache 1',
                        Description: 'This is cache 1',
                        GPSX: 123.456,
                        GPSY: 789.012,
                        Report: "Reported",
                        Pass: 'password',
                        Maintainer: userID
                    }

                    let updatedMochCache: Cache = {
                        ID: 'cache1',
                        Name: 'Cache 1 Modified',
                        Description: 'This is cache 1 Modified',
                        GPSX: 33.334,
                        GPSY: 43.52,
                        Report: "",
                        Pass: 'password123',
                        Maintainer: userID
                    }
    
                    it('should update the cache', async () => {
                        ctx.stub.getState.callsFake(async () => Promise.resolve(
                            Buffer.from(stringify(sortKeys(mochCache)))
                        ))
                    
                        const resp: Cache = await contract.UpdateCache(
                            ctx,
                            updatedMochCache.ID,
                            updatedMochCache.Name,
                            updatedMochCache.Description,
                            updatedMochCache.GPSX,
                            updatedMochCache.GPSY,
                            updatedMochCache.Pass,
                            updatedMochCache.Report
                        )
                    
                        expect(ctx.stub.putState.calledOnceWithExactly(
                            `CACHE-${mochCache.ID}`,
                            Buffer.from(stringify(sortKeys(updatedMochCache)))
                        )).to.be.true

                        expect(stringify(sortKeys(resp))).to.be.eq(stringify(sortKeys(updatedMochCache)))
                    })

                    it('should throw an error if not the maintainer tries to update', async () => {
                        ctx.stub.getState.callsFake(async () => Promise.resolve(
                            Buffer.from(stringify(sortKeys({...mochCache, Maintainer: "NotTheMaintainer"})))
                        ))
                    
                        const fail = () => contract.UpdateCache(
                            ctx,
                            updatedMochCache.ID,
                            updatedMochCache.Name,
                            updatedMochCache.Description,
                            updatedMochCache.GPSX,
                            updatedMochCache.GPSY,
                            updatedMochCache.Pass,
                            updatedMochCache.Report
                        )
                    
                        await expect(fail()).to.eventually.be.rejectedWith(`Not maintainer`)
                    })
                
                    it('should throw an error if the cache does not exist', async () => {
                    const fail = () => contract.UpdateCache(
                        ctx,
                        mochCache.ID,
                        mochCache.Name,
                        mochCache.Description,
                        mochCache.GPSX,
                        mochCache.GPSY,
                        mochCache.Pass,
                        mochCache.Report
                    )
                
                    await expect(fail()).to.eventually.be.rejectedWith(`Cache ${mochCache.ID} does not exist`)
                    })
            })

            describe('DeleteCache', () => {
                    
                let mochCache: Cache = {
                    ID: 'cache1',
                    Name: 'Cache 1',
                    Description: 'This is cache 1',
                    GPSX: 123.456,
                    GPSY: 789.012,
                    Report: "Reported",
                    Pass: 'password',
                    Maintainer: userID
                }

                it('should delete the cache', async () => {
                    ctx.stub.getState.callsFake(async () => Promise.resolve(
                        Buffer.from(stringify(sortKeys(mochCache)))
                    ))
                
                    await contract.DeleteCache(ctx, mochCache.ID)
                
                    expect(ctx.stub.deleteState.calledOnceWithExactly(`CACHE-${mochCache.ID}`)).to.be.true
                })

                it('should throw an error if not the maintainer tries to delete', async () => {
                    ctx.stub.getState.callsFake(async () => Promise.resolve(
                        Buffer.from(stringify(sortKeys({...mochCache, Maintainer: "NotTheMaintainer"})))
                    ))
                
                    const fail = () => contract.DeleteCache(ctx, mochCache.ID)
                
                    await expect(fail()).to.eventually.be.rejectedWith(`Not maintainer`)
                })
            
                it('should throw an error if the cache does not exist', async () => {
                    const fail = () => contract.DeleteCache(ctx, mochCache.ID)
                
                    await expect(fail()).to.eventually.be.rejectedWith(`Cache ${mochCache.ID} does not exist`)
                })
            })

            describe('GetCachePass', () => {

                let mochCache: Cache = {
                    ID: 'cache1',
                    Name: 'Cache 1',
                    Description: 'This is cache 1',
                    GPSX: 123.456,
                    GPSY: 789.012,
                    Report: "",
                    Pass: 'password',
                    Maintainer: userID
                }

                it('should return the cache pass', async () => {
                    ctx.stub.getState.callsFake(async () => Promise.resolve(
                        Buffer.from(stringify(sortKeys(mochCache)))
                    ))
                
                    const pass = await contract.GetCachePass(ctx, mochCache.ID)
                
                    expect(pass).to.equal(mochCache.Pass)
                })

                it('should throw an error if not the maintainer tries to get the pass', async () => {
                    ctx.stub.getState.callsFake(async () => Promise.resolve(
                        Buffer.from(stringify(sortKeys({...mochCache, Maintainer: "NotTheMaintainer"})))
                    ))
                
                    const fail = () => contract.GetCachePass(ctx, mochCache.ID)
                
                    await expect(fail()).to.eventually.be.rejectedWith(`Not maintainer`)
                })

                it('should throw an error if the cache does not exist', async () => {
                
                    const fail = () => contract.GetCachePass(ctx, mochCache.ID)
                
                    await expect(fail()).to.eventually.be.rejectedWith(`Cache ${mochCache.ID} does not exist`)
                })
            })

        })

        describe('Public', () => {
            describe('CreateCache', () => {

                const mochCache: Cache = {
                    ID: 'cache1',
                    Name: 'Cache 1',
                    Description: 'This is cache 1',
                    GPSX: 123.456,
                    GPSY: 789.012,
                    Report: "",
                    Pass: 'password',
                    Maintainer: ""
                }

                it('should create a new cache', async () => {
                    await contract.CreateCache(
                        ctx,
                        mochCache.ID,
                        mochCache.Name,
                        mochCache.Description,
                        mochCache.GPSX,
                        mochCache.GPSY,
                        mochCache.Pass
                    )

                    const returncache: Cache = {
                        ID: 'cache1',
                        Name: 'Cache 1',
                        Description: 'This is cache 1',
                        GPSX: 123.456,
                        GPSY: 789.012,
                        Report: "",
                        Pass: 'password',
                        Maintainer: userID
                        }
                
                    expect(ctx.stub.putState.calledOnceWithExactly(
                        `CACHE-${mochCache.ID}`,
                        Buffer.from(stringify(sortKeys(returncache))))
                    ).to.be.true
                })
            
                it('should throw an error if the cache already exists', async () => {
                ctx.stub.getState.callsFake(async () => Promise.resolve(
                    Buffer.from(stringify(sortKeys(mochCache)))
                ))
            
                const fail = () => contract.CreateCache(
                    ctx,
                    mochCache.ID,
                    mochCache.Name,
                    mochCache.Description,
                    mochCache.GPSX,
                    mochCache.GPSY,
                    mochCache.Pass
                )
            
                await expect(fail()).to.eventually.be.rejectedWith(`Cache ${mochCache.ID} already exists`)
                })
            })

            describe('GetCache', () => {

                let mochCache: Cache = {
                    ID: 'cache1',
                    Name: 'Cache 1',
                    Description: 'This is cache 1',
                    GPSX: 123.456,
                    GPSY: 789.012,
                    Report: "",
                    Pass: 'password',
                    Maintainer: userID
                }

                it('should return the cache', async () => {
                    ctx.stub.getState.callsFake(async () => Promise.resolve(
                        Buffer.from(stringify(sortKeys(mochCache)))
                    ))
                
                    const cache = await contract.GetCache(ctx, mochCache.ID)
                
                    expect(cache).to.deep.equal(mochCache)
                })

                it('should return the cache without the pass', async () => {
                    ctx.stub.getState.callsFake(async () => Promise.resolve(
                    Buffer.from(stringify(sortKeys({ ...mochCache, Maintainer: "NotTheUser" })))
                    ))
                
                    const cache = await contract.GetCache(ctx, mochCache.ID)
                
                    expect(cache).to.deep.equal({ ...mochCache, Maintainer: "NotTheUser", Pass: "" })
                })

                it('should throw an error if the cache does not exist', async () => {
                
                    const fail = () => contract.GetCache(ctx, mochCache.ID)
                
                    await expect(fail()).to.eventually.be.rejectedWith(`Cache ${mochCache.ID} does not exist`)
                })
            })

            describe('GetAllCaches', () => {
                    
                const mochCache1: Cache = {
                    ID: 'cache1',
                    Name: 'Cache 1',
                    Description: 'This is cache 1',
                    GPSX: 123.456,
                    GPSY: 789.012,
                    Report: "",
                    Pass: 'password',
                    Maintainer: userID
                }

                const mochCache2: Cache = {
                    ID: 'cache2',
                    Name: 'Cache 2',
                    Description: 'This is cache 2',
                    GPSX: 123.456,
                    GPSY: 789.012,
                    Report: "",
                    Pass: 'password',
                    Maintainer: userID
                }

                const mochCache3: Cache = {
                    ID: 'cache3',
                    Name: 'Cache 3',
                    Description: 'This is cache 3',
                    GPSX: 123.456,
                    GPSY: 789.012,
                    Report: "",
                    Pass: 'password',
                    Maintainer: userID
                }

                const mochCache4: Cache = {
                    ID: 'cache4',
                    Name: 'Cache 4',
                    Description: 'This is cache 4',
                    GPSX: 123.456,
                    GPSY: 789.012,
                    Report: "",
                    Pass: 'password',
                    Maintainer: userID
                }

                it('should return all the caches', async () => {
                    let mockIterator: any;

                    mockIterator = {
                        next: sinon.stub()
                    };
        
                    mockIterator.next.onCall(0).resolves({
                        value: { key: `CACHE-${mochCache1.ID}`, value: Buffer.from(stringify(sortKeys(mochCache1))) },
                        done: false
                    });
                    mockIterator.next.onCall(1).resolves({
                        value: { key: `CACHE-${mochCache2.ID}`, value: Buffer.from(stringify(sortKeys(mochCache2))) },
                        done: false
                    });
                    mockIterator.next.onCall(2).resolves({
                        value: { key: `CACHE-${mochCache3.ID}`, value: Buffer.from(stringify(sortKeys(mochCache3))) },
                        done: false
                    });
                    mockIterator.next.onCall(3).resolves({
                        value: { key: `CACHE-${mochCache4.ID}`, value: Buffer.from(stringify(sortKeys(mochCache4))) },
                        done: false
                    });
                    mockIterator.next.onCall(4).resolves({
                        done: true
                    });

                    ctx.stub.getStateByRange.returns(mockIterator)

                    const caches = await contract.GetAllCaches(ctx);

                    expect(caches.length).to.equal(4);

                    expect(caches).to.deep.equal([
                        sortKeys(mochCache1),
                        sortKeys(mochCache2),
                        sortKeys(mochCache3),
                        sortKeys(mochCache4)
                    ]);
                })
                
                it('should return an empty list if there are not caches', async () => {
                    let mockIteratorEmpty: any;
                    mockIteratorEmpty = {
                        next: sinon.stub()
                    };
                    mockIteratorEmpty.next.onCall(0).resolves({
                        done: true
                    });
                    ctx.stub.getStateByRange.returns(mockIteratorEmpty)

                    const caches = await contract.GetAllCaches(ctx);

                    expect(caches.length).to.equal(0);
                    expect(caches).to.deep.equal([]);
                })
            })

            describe('CacheExists', () => {

                let mochCache: Cache = {
                    ID: 'cache1',
                    Name: 'Cache 1',
                    Description: 'This is cache 1',
                    GPSX: 123.456,
                    GPSY: 789.012,
                    Report: "",
                    Pass: 'password',
                    Maintainer: userID
                }

                it('should return true if the cache exists', async () => {
                    ctx.stub.getState.callsFake(async () => Promise.resolve(
                        Buffer.from(stringify(sortKeys(mochCache)))
                    ))
                
                    const exists = await contract.CacheExists(ctx, mochCache.ID)
                
                    expect(exists).to.be.true
                })
            
                it('should return false if the cache does not exist', async () => {
                
                    const exists = await contract.CacheExists(ctx, mochCache.ID)
                
                    expect(exists).to.be.false
                })
            })

            describe('ReportCache', () => {

                let mochCache: Cache = {
                    ID: 'cache1',
                    Name: 'Cache 1',
                    Description: 'This is cache 1',
                    GPSX: 123.456,
                    GPSY: 789.012,
                    Report: "",
                    Pass: 'password',
                    Maintainer: userID
                }

                it('should add a report to the cache', async () => {
                ctx.stub.getState.callsFake(async () => Promise.resolve(
                    Buffer.from(stringify(sortKeys(mochCache)))
                ))

                expect(ctx.stub.putState.calledOnceWithExactly(
                    `CACHE-${mochCache.ID}`,
                    Buffer.from(stringify(sortKeys({ ...mochCache, Report: 'Report' })))
                )).to.be.false

                await contract.ReportCache(ctx, mochCache.ID, 'Report')
            
                expect(ctx.stub.putState.calledOnceWithExactly(
                    `CACHE-${mochCache.ID}`,
                    Buffer.from(stringify(sortKeys({ ...mochCache, Report: 'Report' })))
                )).to.be.true
                })
            
                it('should throw an error if the cache does not exist', async () => {
                const fail = () => contract.ReportCache(ctx, mochCache.ID, 'Report')
            
                await expect(fail()).to.eventually.be.rejectedWith(`Cache ${mochCache.ID} does not exist`)
                })
            })
        })
    })

    describe('Visit Log', () => {
        describe('CreateLog', () => {

            let mochCache: Cache = {
                ID: 'cache1',
                Name: 'Cache 1',
                Description: 'This is cache 1',
                GPSX: 123.456,
                GPSY: 789.012,
                Report: "",
                Pass: 'password',
                Maintainer: userID
            }

            let mochLog: VisitLog = {
                ID: 'log1',
                Trackables: [],
                User: userID,
                Cache: 'cache1',
                Time: "2021-01-01T00:00:00Z"
            }

            it('should create a new log', async () => {
                ctx.stub.getState.withArgs(`CACHE-${mochCache.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys(mochCache)))
                ));

                const result: VisitLog = await contract.CreateLog(
                    ctx,
                    mochLog.ID,
                    mochCache.ID,
                    mochCache.Pass
                )

                expect(stringify(sortKeys(result))).to.be.eq(stringify(sortKeys({...mochLog, Time: result.Time})))

                expect(ctx.stub.putState.calledOnceWithExactly(
                    `LOG-${mochLog.ID}`,
                    Buffer.from(stringify(sortKeys({...mochLog, Time: result.Time}))
                ))).to.be.true
            })

            it('should throw an error if the pass is wrong', async () => {
                ctx.stub.getState.withArgs(`CACHE-${mochCache.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys({...mochCache, Pass: "wrongpass"})))
                ));

                const fail = () => contract.CreateLog(
                    ctx,
                    mochLog.ID,
                    mochCache.ID,
                    mochCache.Pass
                )
            
                await expect(fail()).to.eventually.be.rejectedWith(`Wrong Pass!`)
            })
        
            it('should throw an error if the cache does not exists', async () => {
            
                const fail = () => contract.CreateLog(
                    ctx,
                    mochLog.ID,
                    mochCache.ID,
                    mochCache.Pass
                )
            
                await expect(fail()).to.eventually.be.rejectedWith(`Cache ${mochCache.ID} does not exist`)
            })

            it('should throw an error if the log already exists', async () => {
                ctx.stub.getState.callsFake(async () => Promise.resolve(
                    Buffer.from(stringify(sortKeys(mochLog)))
                ))
            
                const fail = () => contract.CreateLog(
                    ctx,
                    mochLog.ID,
                    mochCache.ID,
                    mochCache.Pass
                )
            
                await expect(fail()).to.eventually.be.rejectedWith(`Log ${mochLog.ID} already exists`)
            })
        })

        describe('GetLog', () => {

            let mochLog: VisitLog = {
                ID: 'log1',
                Trackables: [],
                User: userID,
                Cache: 'cache1',
                Time: '2021-01-01T00:00:00Z'
            }

            it('should return the log', async () => {
                ctx.stub.getState.callsFake(async () => Promise.resolve(
                    Buffer.from(stringify(sortKeys(mochLog)))
                ))
            
                const log = await contract.GetLog(ctx, mochLog.ID)
            
                expect(log).to.deep.equal(mochLog)
            })

            it('should throw an error if the log does not exist', async () => {
            
                const fail = () => contract.GetLog(ctx, mochLog.ID)
            
                await expect(fail()).to.eventually.be.rejectedWith(`Log ${mochLog.ID} does not exist`)
            })
        })

        describe('GetAllLogs', () => {

            const mochLog1: VisitLog = {
                ID: 'log1',
                Trackables: [],
                User: userID,
                Cache: 'cache1',
                Time: '2021-01-01T00:00:00Z'
            }

            const mochLog2: VisitLog = {
                ID: 'log2',
                Trackables: [],
                User: userID,
                Cache: 'cache2',
                Time: '2021-01-02T00:00:00Z'
            }

            const mochLog3: VisitLog = {
                ID: 'log3',
                Trackables: [],
                User: userID,
                Cache: 'cache3',
                Time: '2021-01-03T00:00:00Z'
            }

            const mochLog4: VisitLog = {
                ID: 'log4',
                Trackables: [],
                User: userID,
                Cache: 'cache4',
                Time: '2021-01-04T00:00:00Z'
            }


            it('should return all the trackables', async () => {
                let mockIterator: any;

                mockIterator = {
                    next: sinon.stub()
                };
    
                mockIterator.next.onCall(0).resolves({
                    value: { key: `LOG-${mochLog1.ID}`, value: Buffer.from(stringify(sortKeys(mochLog1))) },
                    done: false
                });
                mockIterator.next.onCall(1).resolves({
                    value: { key: `LOG-${mochLog2.ID}`, value: Buffer.from(stringify(sortKeys(mochLog2))) },
                    done: false
                });
                mockIterator.next.onCall(2).resolves({
                    value: { key: `LOG-${mochLog3.ID}`, value: Buffer.from(stringify(sortKeys(mochLog3))) },
                    done: false
                });
                mockIterator.next.onCall(3).resolves({
                    value: { key: `LOG-${mochLog4.ID}`, value: Buffer.from(stringify(sortKeys(mochLog4))) },
                    done: false
                });
                mockIterator.next.onCall(4).resolves({
                    done: true
                });

                ctx.stub.getStateByRange.returns(mockIterator)

                const trackables = await contract.GetAllTrackables(ctx);

                expect(trackables.length).to.equal(4);
                expect(trackables).to.deep.equal([
                    sortKeys(mochLog1),
                    sortKeys(mochLog2),
                    sortKeys(mochLog3),
                    sortKeys(mochLog4)
                ]);
            })

            it('should return an empty list if there are not logs', async () => {
                let mockIteratorEmpty: any;
                mockIteratorEmpty = {
                    next: sinon.stub()
                };
                mockIteratorEmpty.next.onCall(0).resolves({
                    done: true
                });
                ctx.stub.getStateByRange.returns(mockIteratorEmpty)

                const logs = await contract.GetAllLogs(ctx);

                expect(logs.length).to.equal(0);
                expect(logs).to.deep.equal([]);
            })
        })

        describe('LogExists', () => {

            let mochLog: VisitLog = {
                ID: 'log1',
                Trackables: [],
                User: userID,
                Cache: 'cache1',
                Time: '2021-01-01T00:00:00Z'
            }

            it('should return true if the log exists', async () => {
                ctx.stub.getState.callsFake(async () => Promise.resolve(
                    Buffer.from(stringify(sortKeys(mochLog)))
                ))
            
                const exists = await contract.LogExists(ctx, mochLog.ID)
            
                expect(exists).to.be.true
            })
        
            it('should return false if the log does not exist', async () => {
            
                const exists = await contract.LogExists(ctx, mochLog.ID)
            
                expect(exists).to.be.false
            })
        })
    })

    describe('Trackable', () => {

        describe('CreateTrackable', () => {

            
            let mochTrackable: Trackable = {
                ID: 'trackable1',
                Name: 'CacheCoin',
                Inserted: true,
                VisitLog: 'log1'
            }
            
            let mochLog: VisitLog = {
                ID: 'log1',
                Trackables: [],
                User: userID,
                Cache: 'cache1',
                Time: '2021-01-01T00:00:00Z'
            }

            it('should create a new trackable', async () => {
                ctx.stub.getState.withArgs(`LOG-${mochLog.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys(mochLog)))
                ));

                
                const resp: Trackable = await contract.CreateTrackable(
                    ctx,
                    mochTrackable.ID,
                    mochLog.ID,
                    mochTrackable.Name
                )
                
                expect(stringify(sortKeys(resp))).to.be.eq(stringify(sortKeys(mochTrackable)))

                expect(ctx.stub.putState.calledTwice).to.be.true

                expect(ctx.stub.putState.calledWith(
                    `TRACKABLE-${mochTrackable.ID}`,
                    Buffer.from(stringify(sortKeys(mochTrackable))
                ))).to.be.true

                expect(ctx.stub.putState.calledWith(
                    `LOG-${mochLog.ID}`,
                    Buffer.from(stringify(sortKeys({...mochLog, Trackables: [`${mochTrackable.ID}-IN`]}))
                ))).to.be.true
            })
            
            it('should throw an error if the log was not made by the user', async () => {
                ctx.stub.getState.withArgs(`LOG-${mochLog.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys({...mochLog, User: "NotTheUser"})))
                ));

                const fail = () => contract.CreateTrackable(
                    ctx,
                    mochTrackable.ID,
                    mochLog.ID,
                    mochTrackable.Name
                )
                
                await expect(fail()).to.eventually.be.rejectedWith(`Visitlog is not made by the User!`)
            })

            it('should throw an error if the log does not exists', async () => {
                
                const fail = () => contract.CreateTrackable(
                    ctx,
                    mochTrackable.ID,
                    mochTrackable.VisitLog,
                    mochTrackable.Name
                )
            
                await expect(fail()).to.eventually.be.rejectedWith(`Log ${mochTrackable.VisitLog} does not exist`)
            })
        
            it('should throw an error if the trackable already exists', async () => {
                ctx.stub.getState.callsFake(async () => Promise.resolve(
                    Buffer.from(stringify(sortKeys(mochTrackable)))
                ))
            
                const fail = () => contract.CreateTrackable(
                    ctx,
                    mochTrackable.ID,
                    mochTrackable.VisitLog,
                    mochTrackable.Name
                )
            
                await expect(fail()).to.eventually.be.rejectedWith(`Trackable ${mochTrackable.ID} already exists`)
            })
        })

        describe('GetTrackable', () => {
                
            let mochTrackable: Trackable = {
                ID: 'trackable1',
                Name: 'CacheCoin',
                Inserted: true,
                VisitLog: 'log1'
            }

            it('should return the trackable', async () => {
                ctx.stub.getState.callsFake(async () => Promise.resolve(
                    Buffer.from(stringify(sortKeys(mochTrackable)))
                ))
            
                const trackable = await contract.GetTrackable(ctx, mochTrackable.ID)
            
                expect(trackable).to.deep.equal(mochTrackable)
            })

            it('should throw an error if the trackable does not exist', async () => {
            
                const fail = () => contract.GetTrackable(ctx, mochTrackable.ID)
            
                await expect(fail()).to.eventually.be.rejectedWith(`Trackable ${mochTrackable.ID} does not exist`)
            })
        })

        describe('GetAllTrackables', () => {

            let mochTrackable1: Trackable = {
                ID: 'trackable1',
                Name: 'CacheCoin type 1',
                Inserted: true,
                VisitLog: 'log1'
            }

            let mochTrackable2: Trackable = {
                ID: 'trackable2',
                Name: 'CacheCoin type 2',
                Inserted: false,
                VisitLog: 'log1'
            }

            let mochTrackable3: Trackable = {
                ID: 'trackable3',
                Name: 'CacheCoin type 3',
                Inserted: true,
                VisitLog: 'log2'
            }

            let mochTrackable4: Trackable = {
                ID: 'trackable4',
                Name: 'CacheCoin type 4',
                Inserted: false,
                VisitLog: 'log2'
            }

            it('should return all the trackables', async () => {
                let mockIterator: any;

                mockIterator = {
                    next: sinon.stub()
                };
    
                mockIterator.next.onCall(0).resolves({
                    value: { key: `TRACKABLE-${mochTrackable1.ID}`, value: Buffer.from(stringify(sortKeys(mochTrackable1))) },
                    done: false
                });
                mockIterator.next.onCall(1).resolves({
                    value: { key: `TRACKABLE-${mochTrackable2.ID}`, value: Buffer.from(stringify(sortKeys(mochTrackable2))) },
                    done: false
                });
                mockIterator.next.onCall(2).resolves({
                    value: { key: `TRACKABLE-${mochTrackable3.ID}`, value: Buffer.from(stringify(sortKeys(mochTrackable3))) },
                    done: false
                });
                mockIterator.next.onCall(3).resolves({
                    value: { key: `TRACKABLE-${mochTrackable4.ID}`, value: Buffer.from(stringify(sortKeys(mochTrackable4))) },
                    done: false
                });
                mockIterator.next.onCall(4).resolves({
                    done: true
                });

                ctx.stub.getStateByRange.returns(mockIterator)

                const trackables = await contract.GetAllTrackables(ctx);

                expect(trackables.length).to.equal(4);
                expect(trackables).to.deep.equal([
                    sortKeys(mochTrackable1),
                    sortKeys(mochTrackable2),
                    sortKeys(mochTrackable3),
                    sortKeys(mochTrackable4)
                ]);
            })

            it('should return an empty list if there are not trackables', async () => {
                let mockIteratorEmpty: any;
                mockIteratorEmpty = {
                    next: sinon.stub()
                };
                mockIteratorEmpty.next.onCall(0).resolves({
                    done: true
                });
                ctx.stub.getStateByRange.returns(mockIteratorEmpty)

                const trackables = await contract.GetAllTrackables(ctx);

                expect(trackables.length).to.equal(0);
                expect(trackables).to.deep.equal([]);
            })

        })

        describe('TrackableExists', () => {

            let mochTrackable: Trackable = {
                ID: 'trackable1',
                Name: 'CacheCoin',
                Inserted: true,
                VisitLog: 'log1'
            }

            it('should return true if the trackable exists', async () => {
                ctx.stub.getState.callsFake(async () => Promise.resolve(
                    Buffer.from(stringify(sortKeys(mochTrackable)))
                ))
            
                const exists = await contract.TrackableExists(ctx, mochTrackable.ID)
            
                expect(exists).to.be.true
            })
        
            it('should return false if the trackable does not exist', async () => {
            
                const exists = await contract.TrackableExists(ctx, mochTrackable.ID)
            
                expect(exists).to.be.false
            })
        })

        describe('InsertTrackable', () => {

            let oldMochLog: VisitLog = {
                ID: 'log1',
                Trackables: ["trackable1-OUT"],
                User: userID,
                Cache: 'cache1',
                Time: '2021-01-01T00:00:00Z'
            }

            let newMochLog: VisitLog = {
                ID: 'log2',
                Trackables: [],
                User: userID,
                Cache: 'cache2',
                Time: '2021-02-01T00:00:00Z'
            }

            let mochTrackable: Trackable = {
                ID: 'trackable1',
                Name: 'CacheCoin',
                Inserted: false,
                VisitLog: 'log1'
            }

            
            it('should insert the trackable', async () => {
                ctx.stub.getState.withArgs(`LOG-${oldMochLog.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys(oldMochLog)))
                ));

                ctx.stub.getState.withArgs(`LOG-${newMochLog.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys(newMochLog)))
                ));

                ctx.stub.getState.withArgs(`TRACKABLE-${mochTrackable.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys(mochTrackable)))
                ))

                
                const resp: Trackable = await contract.InsertTrackable(
                    ctx,
                    mochTrackable.ID,
                    newMochLog.ID
                )
                
                expect(stringify(sortKeys(resp))).to.be.eq(stringify(sortKeys({...mochTrackable, Inserted: true, VisitLog: newMochLog.ID})))

                expect(ctx.stub.putState.calledTwice).to.be.true

                expect(ctx.stub.putState.calledWith(
                    `TRACKABLE-${mochTrackable.ID}`,
                    Buffer.from(stringify(sortKeys({...mochTrackable, Inserted: true, VisitLog: newMochLog.ID}))
                ))).to.be.true

                expect(ctx.stub.putState.calledWith(
                    `LOG-${newMochLog.ID}`,
                    Buffer.from(stringify(sortKeys({...newMochLog, Trackables: [`${mochTrackable.ID}-IN`]}))
                ))).to.be.true
            })

            it('should throw an error if the trackable does not exist', async () => {
                ctx.stub.getState.withArgs(`LOG-${oldMochLog.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys(oldMochLog)))
                ));

                ctx.stub.getState.withArgs(`LOG-${newMochLog.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys(newMochLog)))
                ));

                const fail = () => contract.InsertTrackable(ctx, mochTrackable.ID, newMochLog.ID)
            
                await expect(fail()).to.eventually.be.rejectedWith(`Trackable ${mochTrackable.ID} does not exist`)
            })

            it('should throw an error if the log does not exist', async () => {
            
                const fail = () => contract.InsertTrackable(ctx, mochTrackable.ID, newMochLog.ID)
            
                await expect(fail()).to.eventually.be.rejectedWith(`Log ${newMochLog.ID} does not exist`)
            })

            it('should throw an error if the trackable is already inserted', async () => {
                ctx.stub.getState.withArgs(`LOG-${oldMochLog.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys(oldMochLog)))
                ));

                ctx.stub.getState.withArgs(`LOG-${newMochLog.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys(newMochLog)))
                ));

                ctx.stub.getState.withArgs(`TRACKABLE-${mochTrackable.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys({...mochTrackable, Inserted: true}))
                )))

                const fail = () => contract.InsertTrackable(ctx, mochTrackable.ID, newMochLog.ID)
            
                await expect(fail()).to.eventually.be.rejectedWith(`Trackable is already inserted!`)
            })

            it('should throw an error if the new log was not made by the user', async () => {
                ctx.stub.getState.withArgs(`LOG-${oldMochLog.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys({...newMochLog, User: "NotTheUser"})))
                ));

                ctx.stub.getState.withArgs(`LOG-${newMochLog.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys({...newMochLog, User: "NotTheUser"})))
                ));

                ctx.stub.getState.withArgs(`TRACKABLE-${mochTrackable.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys(mochTrackable))
                )))

                const fail = () => contract.InsertTrackable(ctx, mochTrackable.ID, newMochLog.ID)
            
                await expect(fail()).to.eventually.be.rejectedWith(`Visitlog is not made by the User!`)
            })

            it('should throw an error if the new log is made before the old log', async () => {
                ctx.stub.getState.withArgs(`LOG-${oldMochLog.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys({...newMochLog, Time: '2021-02-01T00:00:00Z'})))
                ));

                ctx.stub.getState.withArgs(`LOG-${newMochLog.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys(newMochLog)))
                ));

                ctx.stub.getState.withArgs(`TRACKABLE-${mochTrackable.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys(mochTrackable))
                )))

                const fail = () => contract.InsertTrackable(ctx, mochTrackable.ID, newMochLog.ID)
            
                await expect(fail()).to.eventually.be.rejectedWith(`Can not insert trackable into a log made before the current log!`)
            })

            it('should throw an error if the trackable is not owned by the user', async () => {
                ctx.stub.getState.withArgs(`LOG-${oldMochLog.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys({...newMochLog, User: "NotTheUser"})))
                ));

                ctx.stub.getState.withArgs(`LOG-${newMochLog.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys(newMochLog)))
                ));

                ctx.stub.getState.withArgs(`TRACKABLE-${mochTrackable.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys(mochTrackable))
                )))

                const fail = () => contract.InsertTrackable(ctx, mochTrackable.ID, newMochLog.ID)
            
                await expect(fail()).to.eventually.be.rejectedWith(`Trackable is not owned by the User!`)
            })
        })

        describe('RemoveTrackable', () => {
        
            let oldMochLog: VisitLog = {
                ID: 'log1',
                Trackables: ["trackable1-IN"],
                User: userID,
                Cache: 'cache1',
                Time: '2021-01-01T00:00:00Z'
            }

            let newMochLog: VisitLog = {
                ID: 'log2',
                Trackables: [],
                User: userID,
                Cache: 'cache1',
                Time: '2021-02-01T00:00:00Z'
            }

            let mochTrackable: Trackable = {
                ID: 'trackable1',
                Name: 'CacheCoin',
                Inserted: true,
                VisitLog: 'log1'
            }

    
            it('should remove the trackable', async () => {
                ctx.stub.getState.withArgs(`LOG-${oldMochLog.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys(oldMochLog)))
                ));

                ctx.stub.getState.withArgs(`LOG-${newMochLog.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys(newMochLog)))
                ));

                ctx.stub.getState.withArgs(`TRACKABLE-${mochTrackable.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys(mochTrackable)))
                ))

                
                const resp: Trackable = await contract.RemoveTrackable(
                    ctx,
                    mochTrackable.ID,
                    newMochLog.ID
                )
                
                expect(stringify(sortKeys(resp))).to.be.eq(stringify(sortKeys({...mochTrackable, Inserted: false, VisitLog: newMochLog.ID})))

                expect(ctx.stub.putState.calledTwice).to.be.true

                expect(ctx.stub.putState.calledWith(
                    `TRACKABLE-${mochTrackable.ID}`,
                    Buffer.from(stringify(sortKeys({...mochTrackable, Inserted: false, VisitLog: newMochLog.ID}))
                ))).to.be.true

                expect(ctx.stub.putState.calledWith(
                    `LOG-${newMochLog.ID}`,
                    Buffer.from(stringify(sortKeys({...newMochLog, Trackables: [`${mochTrackable.ID}-OUT`]}))
                ))).to.be.true
            })
    
            it('should throw an error if the trackable does not exist', async () => {
                ctx.stub.getState.withArgs(`LOG-${oldMochLog.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys(oldMochLog)))
                ));

                ctx.stub.getState.withArgs(`LOG-${newMochLog.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys(newMochLog)))
                ));

                const fail = () => contract.RemoveTrackable(ctx, mochTrackable.ID, newMochLog.ID)
            
                await expect(fail()).to.eventually.be.rejectedWith(`Trackable ${mochTrackable.ID} does not exist`)
            })
    
            it('should throw an error if the log does not exist', async () => {
            
                const fail = () => contract.RemoveTrackable(ctx, mochTrackable.ID, newMochLog.ID)
            
                await expect(fail()).to.eventually.be.rejectedWith(`Log ${newMochLog.ID} does not exist`)
            })
    
            it('should throw an error if the trackable is not inserted', async () => {
                ctx.stub.getState.withArgs(`LOG-${oldMochLog.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys(oldMochLog)))
                ));

                ctx.stub.getState.withArgs(`LOG-${newMochLog.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys(newMochLog)))
                ));

                ctx.stub.getState.withArgs(`TRACKABLE-${mochTrackable.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys({...mochTrackable, Inserted: false}))
                )))

                const fail = () => contract.RemoveTrackable(ctx, mochTrackable.ID, newMochLog.ID)
            
                await expect(fail()).to.eventually.be.rejectedWith(`Trackable is not inserted!`)
            })
    
            it('should throw an error if the new log was not made by the user', async () => {
                ctx.stub.getState.withArgs(`LOG-${oldMochLog.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys({...oldMochLog, User: "NotTheUser"})))
                ));

                ctx.stub.getState.withArgs(`LOG-${newMochLog.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys({...newMochLog, User: "NotTheUser"})))
                ));

                ctx.stub.getState.withArgs(`TRACKABLE-${mochTrackable.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys(mochTrackable))
                )))

                const fail = () => contract.RemoveTrackable(ctx, mochTrackable.ID, newMochLog.ID)
            
                await expect(fail()).to.eventually.be.rejectedWith(`Visitlog is not made by the User!`)
            })
    
            it('should throw an error if the new log is made before the old log', async () => {
                ctx.stub.getState.withArgs(`LOG-${oldMochLog.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys({...oldMochLog, Time: '2021-02-01T00:00:00Z'})))
                ));

                ctx.stub.getState.withArgs(`LOG-${newMochLog.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys(newMochLog)))
                ));

                ctx.stub.getState.withArgs(`TRACKABLE-${mochTrackable.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys(mochTrackable))
                )))

                const fail = () => contract.RemoveTrackable(ctx, mochTrackable.ID, newMochLog.ID)
            
                await expect(fail()).to.eventually.be.rejectedWith(`Can not remove trackable from a log made before the current log!`)
            })
    
            it('should throw an error if the trackable and the new log is not for the same cache', async () => {
                ctx.stub.getState.withArgs(`LOG-${oldMochLog.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys(oldMochLog)))
                ));

                ctx.stub.getState.withArgs(`LOG-${newMochLog.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys({...newMochLog, Cache: "cache2"})))
                ));

                ctx.stub.getState.withArgs(`TRACKABLE-${mochTrackable.ID}`).returns(Promise.resolve(
                    Buffer.from(stringify(sortKeys(mochTrackable))
                )))

                const fail = () => contract.RemoveTrackable(ctx, mochTrackable.ID, newMochLog.ID)
            
                await expect(fail()).to.eventually.be.rejectedWith(`Trackable and Visitlog is for different caches!`)
            })
        })
    })
})
