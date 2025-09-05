const cookie = {};

function serializeCookie(name, value, options = {}) {
  let str = `${name}=${encodeURIComponent(value)}`;

  if (options.maxAge != null) {
    str += `; Max-Age=${options.maxAge}`;
  }
  if (options.domain) {
    str += `; Domain=${options.domain}`;
  }
  if (options.path) {
    str += `; Path=${options.path}`;
  }
  if (options.expires instanceof Date) {
    str += `; Expires=${options.expires.toUTCString()}`;
  }
  if (options.httpOnly) {
    str += `; HttpOnly`;
  }
  if (options.secure) {
    str += `; Secure`;
  }
  if (options.sameSite) {
    str += `; SameSite=${options.sameSite}`;
  }

  return str;
}

cookie.serialize = serializeCookie;

class ExpressMockResponse {
  static new() {
    return {
      statusCode: 200,
      headersSent: false,
      headers: {},
      body: undefined,
      req: null,
      set(name, value) {
        this.headers[name] = value;
        return this;
      },
      get(name) {
        return this.headers[name];
      },
      append(name, value) {
        const prev = this.get(name);

        if (prev) {
          value = Array.isArray(prev)
            ? prev.concat(value)
            : Array.isArray(value)
              ? [prev].concat(value)
              : [prev, value];
        }

        this.set(name, value);
      },
      type(type) {
        switch (type) {
          case "json":
            type = "application/json";
            break;
          case "html":
            type = "text/html";
            break;
          case "txt":
            type = "text/plain";
            break;
          default:
            type = "text/plain";
            break;
        }

        return this.set("Content-Type", type);
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      sendStatus(code) {
        const body = String(code);
        this.status(code);
        this.type("txt");
        return this.send(body);
      },
      json(obj) {
        this.type("json");
        const body = JSON.stringify(obj);
        return this.send(body);
      },
      cookie(name, value, options) {
        var opts = { ...options };

        var val =
          typeof value === "object"
            ? "j:" + JSON.stringify(value)
            : String(value);

        if (opts.maxAge != null) {
          var maxAge = opts.maxAge - 0;

          if (!isNaN(maxAge)) {
            opts.expires = new Date(Date.now() + maxAge);
            opts.maxAge = Math.floor(maxAge / 1000);
          }
        }

        if (opts.path == null) {
          opts.path = "/";
        }

        this.append("Set-Cookie", cookie.serialize(name, String(val), opts));

        return this;
      },
      send(body) {
        const chunk = body;

        switch (typeof chunk) {
          case "string":
            if (!this.get("Content-Type")) {
              this.type("html");
            }
            break;
        }

        this.end(chunk);
        return this;
      },
      end(chunk) {
        if (this.headersSent) {
          throw new Error("Cannot send after headers sent");
        }
        this.body = chunk;
        this.headersSent = true;
        return this;
      },
    };
  }
}

module.exports = ExpressMockResponse;
