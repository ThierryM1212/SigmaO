import {Serializer} from "@coinbarn/ergo-ts";
import * as crypto from "crypto-js";
import { blake2b256, hex} from "@fleet-sdk/crypto";
let ergolib = import('ergo-lib-wasm-browser');


export async function encodeNum(n, isInt = false) {
    if (isInt) return (await ergolib).Constant.from_i32(n).encode_to_base16()
    else return (await ergolib).Constant.from_i64((await ergolib).I64.from_str(n)).encode_to_base16()
}

export async function decodeNum(n, isInt = false) {
    if (isInt) return (await ergolib).Constant.decode_from_base16(n).to_i32()
    else return (await ergolib).Constant.decode_from_base16(n).to_i64().to_str()

}

export async function encodeAddress(address) {
    const byteArray = (await ergolib).Address.from_mainnet_str(address).to_bytes();
    return (await ergolib).Constant.from_byte_array(byteArray);
}

export async function decodeAddress(addr) {
    const address = (await ergolib).Address.from_bytes(addr);
    return address.to_base58();
}

export async function encodeLongArray(longArray) {
    return (await ergolib).Constant.from_i64_str_array(longArray);
}

export async function decodeLongArray(encodedArray) {
    return (await ergolib).Constant.decode_from_base16(encodedArray).to_i64_str_array().map(cur => parseInt(cur))
}

export async function encodeIntArray(intArray) {
    return (await ergolib).Constant.from_i32_array(intArray);
}

export async function decodeIntArray(encodedArray) {
    return (await ergolib).Constant.decode_from_base16(encodedArray).to_i32_array()
}

export async function encodeInt(num) {
    return (await ergolib).Constant.from_i32(num);
}
export async function decodeInt(num) {
    return num.to_i32();
}

export async function getErgoBox(json) {
    return (await ergolib).ErgoBox.from_json(json);
}

export async function encodeLong(num) {
    return (await ergolib).Constant.from_i64((await ergolib).I64.from_str(num));
}
export async function decodeLong(num) {
    return (await ergolib).Constant.decode_from_base16(num).to_i64().to_str();
}

export async function encodeHex(reg) {
    return (await ergolib).Constant.from_byte_array(Buffer.from(reg, 'hex')).encode_to_base16();
}

export async function encodeHexConst(reg) {
    return (await ergolib).Constant.from_byte_array(Buffer.from(reg, 'hex'));
}

export async function encodeHexArrayConst(hexStrArray) {
    const tmp = hexStrArray.map((val) => {
        return new Uint8Array(Buffer.from(val, 'hex'))
    });
    return (await ergolib).Constant.from_coll_coll_byte(tmp);
}

export async function encodeStr(str) {
    return encodeHex(Serializer.stringToHex(str))
}

export async function encodeStrConst(str) {
    return (await ergolib).Constant.from_byte_array(Buffer.from(Serializer.stringToHex(str), 'hex'));
}

export function toHexString(byteArray) {
    return Array.from(byteArray, function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('')
}

export async function decodeString(encoded) {
    return Serializer.stringFromHex(toHexString((await ergolib).Constant.decode_from_base16(encoded).to_byte_array()))
}

export async function decodeHex(encoded) {
    return toHexString((await ergolib).Constant.decode_from_base16(encoded).to_byte_array())
}

export async function decodeHexArray(encoded) {
    return (await ergolib).Constant.decode_from_base16(encoded).to_coll_coll_byte().map(r => toHexString(r))
}

export async function decodeStringArray(encoded) {
    return (await ergolib).Constant.decode_from_base16(encoded).to_coll_coll_byte().map(r => {
        return Serializer.stringFromHex(toHexString(r));
    })
}

export async function sigmaPropToAddress(sigmaProp) {
    return (await ergolib).Address.recreate_from_ergo_tree((await ergolib).ErgoTree.from_base16_bytes("00" + sigmaProp)).to_base58();
}

export async function addressToSigmaPropHex(address) {
    return toHexString((await ergolib).Constant.from_ecpoint_bytes(
        (await ergolib).Address.from_base58(address).to_bytes(0x00).subarray(1, 34)
    ).sigma_serialize_bytes());
}

export function ergToNano(erg) {
    if (erg === undefined) return 0
    if (erg.startsWith('.')) return parseInt(erg.slice(1) + '0'.repeat(9 - erg.length + 1))
    let parts = erg.split('.')
    if (parts.length === 1) parts.push('')
    if (parts[1].length > 9) return 0
    return parseInt(parts[0] + parts[1] + '0'.repeat(9 - parts[1].length))
}


export async function encodeContract(address) {
    const tmp = (await ergolib).Contract.pay_to_address((await ergolib).Address.from_base58(address));
    return tmp.ergo_tree().to_base16_bytes();
}

export async function ergoTreeToAddress(ergoTree) {
    //console.log("ergoTreeToAddress",ergoTree);
    const ergoT = (await ergolib).ErgoTree.from_base16_bytes(ergoTree);
    const address = (await ergolib).Address.recreate_from_ergo_tree(ergoT);
    return address.to_base58();
}

export async function addressToErgoTree(addr) {
    const addrWASM = (await ergolib).Address.from_base58(addr);
    return addrWASM.to_ergo_tree().to_base16_bytes();
}

export async function ergoTreeToTemplate(ergoTree) {
    const ergoTreeWASM = (await ergolib).ErgoTree.from_base16_bytes(ergoTree);
    return toHexString(ergoTreeWASM.template_bytes());
}

export async function ergoTreeToTemplateHash(ergoTree) {
    const ergoTreeTemplateHex = await ergoTreeToTemplate(ergoTree);
    //return toHexString(ergoTreeWASM.template_bytes());
    return crypto.SHA256(crypto.enc.Hex.parse(ergoTreeTemplateHex)).toString(crypto.enc.Hex);
}

export function byteArrayToBase64( byteArray ) {
    var binary = '';
    var len = byteArray.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( byteArray[ i ] );
    }
    return window.btoa( binary );
}

export function getErgotreeHash(ergoTreeHex) {
    return hex.encode(blake2b256(hex.decode(ergoTreeHex)))
}
