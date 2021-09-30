"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rpcToBlockData = void 0;
const ethereumjs_util_1 = require("ethereumjs-util");
const rpcToTxData_1 = require("./rpcToTxData");
function rpcToBlockData(rpcBlock) {
    var _a;
    return {
        header: {
            parentHash: rpcBlock.parentHash,
            // We don't implement uncles - set the hash as the hash of an empty array
            uncleHash: ethereumjs_util_1.KECCAK256_RLP_ARRAY,
            coinbase: rpcBlock.miner,
            stateRoot: rpcBlock.stateRoot,
            transactionsTrie: rpcBlock.transactionsRoot,
            receiptTrie: rpcBlock.receiptsRoot,
            bloom: rpcBlock.logsBloom,
            difficulty: rpcBlock.difficulty,
            number: (_a = rpcBlock.number) !== null && _a !== void 0 ? _a : undefined,
            gasLimit: rpcBlock.gasLimit,
            gasUsed: rpcBlock.gasUsed,
            timestamp: rpcBlock.timestamp,
            extraData: rpcBlock.extraData,
            mixHash: rpcBlock.mixHash,
            nonce: rpcBlock.nonce,
            baseFeePerGas: rpcBlock.baseFeePerGas,
        },
        transactions: rpcBlock.transactions.map(rpcToTxData_1.rpcToTxData),
    };
}
exports.rpcToBlockData = rpcToBlockData;
//# sourceMappingURL=rpcToBlockData.js.map