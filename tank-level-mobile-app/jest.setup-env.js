if (typeof globalThis.FormData === 'undefined') {
  class JestFormData {
    constructor() {
      this._parts = [];
    }

    append(name, value) {
      this._parts.push([String(name), value]);
    }

    set(name, value) {
      const key = String(name);
      let replaced = false;

      for (let i = 0; i < this._parts.length; i += 1) {
        if (this._parts[i][0] === key) {
          if (!replaced) {
            this._parts[i] = [key, value];
            replaced = true;
          } else {
            this._parts.splice(i, 1);
            i -= 1;
          }
        }
      }

      if (!replaced) {
        this._parts.push([key, value]);
      }
    }

    delete(name) {
      const key = String(name);
      for (let i = 0; i < this._parts.length; i += 1) {
        if (this._parts[i][0] === key) {
          this._parts.splice(i, 1);
          i -= 1;
        }
      }
    }

    get(name) {
      const key = String(name);
      for (const part of this._parts) {
        if (part[0] === key) {
          return part[1];
        }
      }
      return null;
    }

    getAll(name) {
      const key = String(name);
      const values = [];
      for (const part of this._parts) {
        if (part[0] === key) {
          values.push(part[1]);
        }
      }
      return values;
    }

    has(name) {
      const key = String(name);
      return this._parts.some((part) => part[0] === key);
    }

    forEach(callback, thisArg) {
      for (const [key, value] of this._parts) {
        callback.call(thisArg, value, key, this);
      }
    }

    *keys() {
      for (const [key] of this._parts) {
        yield key;
      }
    }

    *values() {
      for (const [, value] of this._parts) {
        yield value;
      }
    }

    *entries() {
      for (const part of this._parts) {
        yield part;
      }
    }

    [Symbol.iterator]() {
      return this.entries();
    }
  }

  globalThis.FormData = JestFormData;
}
