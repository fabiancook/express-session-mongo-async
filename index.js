/*
 Copyright 2017 Fabian Cook

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
"use strict";
const ShipperCollection = require('@shipper/shipper-mongodb-async-collection'),
  Collection = new ShipperCollection('sessionStore'),
  SessionStore = require('express-session/session/store');

class ShipperSessionStore extends SessionStore {

  /**
   * @param {ShipperCollection} collection
   */
  constructor(collection) {
    super();
    /**
     * @type {ShipperCollection}
     */
    this.collection = collection || Collection;
  }

  get(sid, fn) {
    return this.getAsync(sid)
      .then((result) => fn(null, result))
      .catch((error) => fn(null, null)); // Should create a new session
  }

  async getAsync(sid) {
    const cursor = await this.collection.find({
      sid
    });

    const data = await cursor.limit(1).next();

    const session = data['session'],
      expires = session['expires'];

    if (!expires || new Date() < expires) {
      return session;
    }

    return this.destroyAsync(sid);
  }

  set(sid, session, fn) {
    return this.setAsync(sid, session)
      .then((result) => fn(null, result))
      .catch((error) => fn(error));
  }

  async setAsync(sid, session) {
    return this.collection.updateOne(
      {
        sid
      },
      {
        $setOnInsert: {
          created: new Date()
        },
        $set: {
          session,
          updated: new Date()
        }
      },
      {
        upsert: true
      }
    );
  }

  destroy(sid, fn) {
    return this.destroyAsync(sid)
      .then((result) => fn(null, result))
      .catch((error) => fn(error));
  }

  async destroyAsync(sid) {
    return this.collection.deleteOne(
      {
        sid
      }
    );
  }

  all(fn) {
    return this.allAsync()
      .then((result) => fn(null, result))
      .catch((error) => fn(error));
  }

  async allAsync() {
    const cursor = await this.collection.find({});
    const documents = await cursor.toArray();
    return documents.map((document) => document['session']);
  }

  clear(fn) {
    return this.clearAsync()
      .then((result) => fn(null, result))
      .catch((error) => fn(error));
  }

  async clearAsync() {
    return this.collection.deleteMany({});
  }

  length(fn) {
    return this.lengthAsync()
      .then((result) => fn(null, result))
      .catch((error) => fn(error));
  }

  async lengthAsync() {
    const cursor = await this.collection.find({});
    return await cursor.count();
  }

}

module.exports = ShipperSessionStore;