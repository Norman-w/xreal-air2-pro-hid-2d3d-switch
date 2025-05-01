// CRC32表（用于快速CRC计算）
const CRC32_TABLE = new Uint32Array(256);

// 初始化CRC32表
(function initCRC32Table() {
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        CRC32_TABLE[i] = c;
    }
})();

/**
 * 计算CRC32校验和，与官方库_cmd_crc函数兼容
 * @param {Uint8Array} data - 要计算校验和的数据
 * @param {number} length - 数据长度
 * @return {number} - 计算得到的CRC32值
 */
export function calculateCRC32(data, length) {
    let crc = 0xFFFFFFFF;

    for (let i = 0; i < length; i++) {
        crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ data[i]) & 0xFF];
    }

    return ~crc >>> 0; // 按位取反并转为无符号32位整数
}