"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const raw_body_1 = __importDefault(require("raw-body"));
const errors_1 = require("../../core/providers/errors");
const jsonrpc_1 = require("../../util/jsonrpc");
/* eslint-disable @nomiclabs/only-hardhat-error */
class JsonRpcHandler {
    constructor(_provider) {
        this._provider = _provider;
        this.handleHttp = async (req, res) => {
            this._setCorsHeaders(res);
            if (req.method === "OPTIONS") {
                this._sendEmptyResponse(res);
                return;
            }
            let jsonHttpRequest;
            try {
                jsonHttpRequest = await _readJsonHttpRequest(req);
            }
            catch (error) {
                this._sendResponse(res, _handleError(error));
                return;
            }
            if (Array.isArray(jsonHttpRequest)) {
                const responses = await Promise.all(jsonHttpRequest.map((singleReq) => this._handleSingleRequest(singleReq)));
                this._sendResponse(res, responses);
                return;
            }
            const rpcResp = await this._handleSingleRequest(jsonHttpRequest);
            this._sendResponse(res, rpcResp);
        };
        this.handleWs = async (ws) => {
            const subscriptions = [];
            let isClosed = false;
            const listener = (payload) => {
                // Don't attempt to send a message to the websocket if we already know it is closed,
                // or the current websocket connection isn't interested in the particular subscription.
                if (isClosed || !subscriptions.includes(payload.subscription)) {
                    return;
                }
                try {
                    ws.send(JSON.stringify({
                        jsonrpc: "2.0",
                        method: "eth_subscription",
                        params: payload,
                    }));
                }
                catch (error) {
                    _handleError(error);
                }
            };
            // Handle eth_subscribe notifications.
            this._provider.addListener("notification", listener);
            ws.on("message", async (msg) => {
                let rpcReq;
                let rpcResp;
                try {
                    rpcReq = _readWsRequest(msg);
                    if (!jsonrpc_1.isValidJsonRequest(rpcReq)) {
                        throw new errors_1.InvalidRequestError("Invalid request");
                    }
                    rpcResp = await this._handleRequest(rpcReq);
                    // If eth_subscribe was successful, keep track of the subscription id,
                    // so we can cleanup on websocket close.
                    if (rpcReq.method === "eth_subscribe" &&
                        jsonrpc_1.isSuccessfulJsonResponse(rpcResp)) {
                        subscriptions.push(rpcResp.result);
                    }
                }
                catch (error) {
                    rpcResp = _handleError(error);
                }
                // Validate the RPC response.
                if (!jsonrpc_1.isValidJsonResponse(rpcResp)) {
                    // Malformed response coming from the provider, report to user as an internal error.
                    rpcResp = _handleError(new errors_1.InternalError("Internal error"));
                }
                if (rpcReq !== undefined) {
                    rpcResp.id = rpcReq.id;
                }
                ws.send(JSON.stringify(rpcResp));
            });
            ws.on("close", () => {
                // Remove eth_subscribe listener.
                this._provider.removeListener("notification", listener);
                // Clear any active subscriptions for the closed websocket connection.
                isClosed = true;
                subscriptions.forEach(async (subscriptionId) => {
                    await this._provider.request({
                        method: "eth_unsubscribe",
                        params: [subscriptionId],
                    });
                });
            });
        };
        this._handleRequest = async (req) => {
            const result = await this._provider.request({
                method: req.method,
                params: req.params,
            });
            return {
                jsonrpc: "2.0",
                id: req.id,
                result,
            };
        };
    }
    _sendEmptyResponse(res) {
        res.writeHead(200);
        res.end();
    }
    _setCorsHeaders(res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Request-Method", "*");
        res.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET");
        res.setHeader("Access-Control-Allow-Headers", "*");
    }
    _sendResponse(res, rpcResp) {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(rpcResp));
    }
    async _handleSingleRequest(req) {
        if (!jsonrpc_1.isValidJsonRequest(req)) {
            return _handleError(new errors_1.InvalidRequestError("Invalid request"));
        }
        const rpcReq = req;
        let rpcResp;
        try {
            rpcResp = await this._handleRequest(rpcReq);
        }
        catch (error) {
            rpcResp = _handleError(error);
        }
        // Validate the RPC response.
        if (!jsonrpc_1.isValidJsonResponse(rpcResp)) {
            // Malformed response coming from the provider, report to user as an internal error.
            rpcResp = _handleError(new errors_1.InternalError("Internal error"));
        }
        if (rpcReq !== undefined) {
            rpcResp.id = rpcReq.id !== undefined ? rpcReq.id : null;
        }
        return rpcResp;
    }
}
exports.default = JsonRpcHandler;
const _readJsonHttpRequest = async (req) => {
    let json;
    try {
        const buf = await raw_body_1.default(req);
        const text = buf.toString();
        json = JSON.parse(text);
    }
    catch (error) {
        throw new errors_1.InvalidJsonInputError(`Parse error: ${error.message}`);
    }
    return json;
};
const _readWsRequest = (msg) => {
    let json;
    try {
        json = JSON.parse(msg);
    }
    catch (error) {
        throw new errors_1.InvalidJsonInputError(`Parse error: ${error.message}`);
    }
    return json;
};
const _handleError = (error) => {
    let txHash;
    if (error.transactionHash !== undefined) {
        txHash = error.transactionHash;
    }
    // In case of non-hardhat error, treat it as internal and associate the appropriate error code.
    if (!errors_1.ProviderError.isProviderError(error)) {
        error = new errors_1.InternalError(error);
    }
    const response = {
        jsonrpc: "2.0",
        id: null,
        error: {
            code: error.code,
            message: error.message,
        },
    };
    if (txHash !== undefined) {
        response.error.data = {
            txHash,
        };
    }
    return response;
};
//# sourceMappingURL=handler.js.map