/**
 * 从设备响应中提取消息ID
 * @param {Uint8Array} response - 设备响应数据
 * @return {number} - 提取的消息ID，失败返回0
 */
function getMessageId(response) {
    if (!response || response.length < 16) {
        return 0;
    }

    // 检查FD头
    if (response[0] !== 0xFD) {
        return 0;
    }

    // 位置15-16是消息ID
    return (response[16] << 8) | response[15];
}

/**
 * 从设备响应中获取事件数据
 * @param {Uint8Array} response - 设备响应数据
 * @return {Uint8Array|null} - 提取的事件数据，失败返回null
 */
function getEventData(response) {
    if (!response || response.length < 22) {
        return null;
    }

    // 检查FD头
    if (response[0] !== 0xFD) {
        return null;
    }

    // 检查长度字段
    const length = (response[6] << 8) | response[5];
    if (length < 0x11) {
        return null;
    }

    // 提取事件数据(从位置22开始)
    const dataLength = length - 0x11;
    if (dataLength <= 0) {
        return null;
    }

    return response.slice(22, 22 + dataLength);
}
