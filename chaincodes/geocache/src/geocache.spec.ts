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

const testCache: Cache = {
    ID: 'cache1',
    Name: 'Cache 1',
    Description: 'This is cache 1',
    GPSX: 123.456,
    GPSY: 789.012,
    Report: "",
    Pass: 'password',
    Maintainer: ""
}

const testTrackable: Trackable = {
    ID: 'trackable1',
    Name: 'CacheCoin',
    Inserted: true,
    VisitLog: 'log1'
}

const testLog: VisitLog = {
    ID: 'log1',
    Trackables: ['trackable1'],
    User: 'user1',
    Cache: 'cache1',
    Time: '2021-01-01T00:00:00Z'
}

describe('Geocache', () => {
    let contract: Geocache
    let ctx: ContextMock
    
    beforeEach(() => {
      contract = new Geocache()
      ctx = new ContextMock()
    })

    describe('CreateCache', () => {
        it('should create a new cache', async () => {
          await contract.CreateCache(
            ctx,
            testCache.ID,
            testCache.Name,
            testCache.Description,
            testCache.GPSX,
            testCache.GPSY,
            testCache.Pass
          )
      
          expect(ctx.stub.putState.calledOnceWithExactly(
            `CACHE-${testCache.ID}`,
            Buffer.from(stringify(sortKeys(testCache))))
          ).to.be.true
        })
    
        it('should throw an error if the cache already exists', async () => {
          ctx.stub.getState.callsFake(async () => Promise.resolve(
            Buffer.from(stringify(sortKeys(testCache)))
          ))
    
          const fail = () => contract.CreateCache(
            ctx,
            testCache.ID,
            testCache.Name,
            testCache.Description,
            testCache.GPSX,
            testCache.GPSY,
            testCache.Pass
          )
    
          await expect(fail()).to.eventually.be.rejectedWith(`Cache ${testCache.ID} already exists`)
        })
    })

    describe('CreateTrackable', () => {
        it('should create a new trackable', async () => {
          await contract.CreateTrackable(
            ctx,
            testTrackable.ID,
            testTrackable.VisitLog,
            testTrackable.Name
          )
      
          expect(ctx.stub.putState.calledOnceWithExactly(
            `TRACKABLE-${testTrackable.ID}`,
            Buffer.from(stringify(sortKeys(testTrackable))))
          ).to.be.true
        })
    
        it('should throw an error if the trackable already exists', async () => {
          ctx.stub.getState.callsFake(async () => Promise.resolve(
            Buffer.from(stringify(sortKeys(testTrackable)))
          ))
    
          const fail = () => contract.CreateTrackable(
            ctx,
            testTrackable.ID,
            testTrackable.VisitLog,
            testTrackable.Name
          )
    
          await expect(fail()).to.eventually.be.rejectedWith(`Trackable ${testTrackable.ID} already exists`)
        })
    })

    describe('CreateLog', () => {
        it('should create a new log', async () => {
          await contract.CreateLog(
            ctx,
            testLog.ID,
            testLog.Cache,
            testCache.Pass
          )
      
          expect(ctx.stub.putState.calledOnceWithExactly(
            `LOG-${testLog.ID}`,
            Buffer.from(stringify(sortKeys(testLog))))
          ).to.be.true
        })
    
        it('should throw an error if the log already exists', async () => {
          ctx.stub.getState.callsFake(async () => Promise.resolve(
            Buffer.from(stringify(sortKeys(testLog)))
          ))
    
          const fail = () => contract.CreateLog(
            ctx,
            testLog.ID,
            testLog.Cache,
            testCache.Pass
          )
    
          await expect(fail()).to.eventually.be.rejectedWith(`Log ${testLog.ID} already exists`)
        })
      })


})
