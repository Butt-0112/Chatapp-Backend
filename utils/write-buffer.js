import Message from "../models/Message"
import UserStatus from "../models/UserStatus"

// Accumulates DB ops in memory, flushes in batch every `flushMs`

class WriteBuffer {
  constructor({ flushMs = 300, maxSize = 200 } = {}) {
    this._inserts   = []   // → Message.insertMany
    this._msgOps    = []   // → Message.bulkWrite
    this._statusOps = []   // → UserStatus.bulkWrite
    this._maxSize   = maxSize
    this._timer     = setInterval(() => this.flush(), flushMs)
  }

  addInsert(doc)     { this._inserts.push(doc);    if (this._inserts.length    >= this._maxSize) this.flush() }
  addMsgOp(op)       { this._msgOps.push(op);      if (this._msgOps.length     >= this._maxSize) this.flush() }
  addStatusOp(op)    { this._statusOps.push(op);   if (this._statusOps.length  >= this._maxSize) this.flush() }

  async flush() {
    const inserts   = this._inserts.splice(0)
    const msgOps    = this._msgOps.splice(0)
    const statusOps = this._statusOps.splice(0)

    await Promise.all([
      inserts.length    && Message.insertMany(inserts, { ordered: false })
                            .catch(err => err.code !== 11000 && console.error('[buf] insertMany:', err)),
      msgOps.length     && Message.bulkWrite(msgOps, { ordered: false })
                            .catch(err => console.error('[buf] msg bulkWrite:', err)),
      statusOps.length  && UserStatus.bulkWrite(statusOps, { ordered: false })
                            .catch(err => console.error('[buf] status bulkWrite:', err)),
    ].filter(Boolean))
  }

  destroy() { clearInterval(this._timer) }
}

export const writeBuffer = new WriteBuffer()