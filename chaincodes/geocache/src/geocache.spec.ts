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
                    
                        await contract.UpdateCache(
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
                        Maintainer: `${userID}`
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
                //TODO
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

            //TODO Add tests for GetAllLogs
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
                ID: 'log10110',
                Trackables: [],
                User: userID,
                Cache: 'cache1',
                Time: '2021-01-01T00:00:00Z'
                //new Date().toISOString()
            }

            it('should create a new log', async () => {
                // TODO
            })

            it('should throw an error if the pass is wrong', async () => {
                // TODO
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
            //TODO
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

            it('should create a new trackable', async () => {
                // TODO
            })

            it('should throw an error if the log was not made by the user', async () => {
                // TODO
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
            //TODO
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

            let mochLog: VisitLog = {
                ID: 'log1',
                Trackables: [],
                User: userID,
                Cache: 'cache1',
                Time: '2021-01-01T00:00:00Z'
            }

            let mochTrackable: Trackable = {
                ID: 'trackable1',
                Name: 'CacheCoin',
                Inserted: false,
                VisitLog: 'log1'
            }

            it('should insert the trackable', async () => {
                // TODO
            })

            it('should throw an error if the trackable does not exist', async () => {
                // TODO
            })

            it('should throw an error if the log does not exist', async () => {
            
                const fail = () => contract.InsertTrackable(ctx, mochTrackable.ID, mochLog.ID)
            
                await expect(fail()).to.eventually.be.rejectedWith(`Log ${mochLog.ID} does not exist`)
            })

            it('should throw an error if the trackable is already inserted', async () => {
                // TODO
            })

            it('should throw an error if the new log was not made by the user', async () => {
                // TODO
            })

            it('should throw an error if the new log is made before the old log', async () => {
                // TODO
            })

            it('should throw an error if the trackable is not owned by the user', async () => {
                // TODO
            })
        })

        describe('RemoveTrackable', () => {
        
            let mochLog: VisitLog = {
                ID: 'log1',
                Trackables: [],
                User: userID,
                Cache: 'cache1',
                Time: '2021-01-01T00:00:00Z'
            }
    
            let mochTrackable: Trackable = {
                ID: 'trackable1',
                Name: 'CacheCoin',
                Inserted: true,
                VisitLog: 'log1'
            }
    
            it('should remove the trackable', async () => {
                // TODO
            })
    
            it('should throw an error if the trackable does not exist', async () => {
                // TODO
            })
    
            it('should throw an error if the log does not exist', async () => {
            
                const fail = () => contract.RemoveTrackable(ctx, mochTrackable.ID, mochLog.ID)
            
                await expect(fail()).to.eventually.be.rejectedWith(`Log ${mochLog.ID} does not exist`)
            })
    
            it('should throw an error if the trackable is not inserted', async () => {
                // TODO
            })
    
            it('should throw an error if the new log was not made by the user', async () => {
                // TODO
            })
    
            it('should throw an error if the new log is made before the old log', async () => {
                // TODO
            })
    
            it('should throw an error if the trackable is not owned by the user', async () => {
                // TODO
            })
        })
    })
})
