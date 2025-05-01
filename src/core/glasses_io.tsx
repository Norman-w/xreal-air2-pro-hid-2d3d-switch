
// 发送命令到接口
export async function sendCommandToInterfaces(command) {
    if (!selectedDevice || !selectedDevice.opened) {
        log("设备未连接", 'error');
        return;
    }

    if (controlInterfaceId === -1) {
        log("未找到有效控制接口", 'error');
        return;
    }

    try {
        // 获取接口模式
        const interfaceSelector = document.getElementById('interfaceSelector');
        const mode = interfaceSelector ? interfaceSelector.value : 'current';

        if (mode === 'all') {
            // 尝试所有接口
            for (let id = 0; id <= 10; id++) {
                try {
                    await selectedDevice.sendReport(id, command);
                    log(`命令已发送到接口ID ${id}`, 'success');
                } catch (error) {
                    log(`发送到接口ID ${id} 失败: ${error.message}`, 'info');
                }
            }
        } else if (mode === 'current') {
            // 使用当前控制接口
            await selectedDevice.sendReport(controlInterfaceId, command);
            log(`命令已发送到控制接口ID ${controlInterfaceId}`, 'success');
        } else {
            // 发送到特定接口
            const id = parseInt(mode);
            await selectedDevice.sendReport(id, command);
            log(`命令已发送到接口ID ${id}`, 'success');
        }
    } catch (error) {
        log(`发送命令失败: ${error.message}`, 'error');
    }
}
function log(message, type = 'info') {
    // const logElement = document.getElementById('log');
    // if (logElement) {
    //     const logMessage = document.createElement('div');
    //     logMessage.className = `log-message ${type}`;
    //     logMessage.textContent = message;
    //     logElement.appendChild(logMessage);
    // }
    console.log(`[${type.toUpperCase()}] ${message}`);
}

export async function sendCommand(device, command) {
    if (!device || !device.opened) {
        log("设备未连接", 'error');
        return;
    }

    try {
        // 1. 将命令转换为字节数组
        let cmdBytes;
        if (typeof command === 'string') {
            cmdBytes = strToPayload(command);
        } else if (command instanceof Uint8Array) {
            cmdBytes = command;
        } else {
            throw new Error("命令格式不支持");
        }

        // 2. 添加前缀0xFD (基于观察到的通信模式)
        const data = new Uint8Array(cmdBytes.length + 1);
        data[0] = 0xFD;  // 添加前缀
        data.set(cmdBytes, 1);  // 复制命令数据


        if (typeof command === 'string') {
            log(`命令文本: ${command}`, 'info');
        }

        // 3. 尝试两种方式发送命令
        try {
            // 方式1: 使用sendReport
            await device.sendReport(0, data);
            log("命令已使用sendReport发送", 'success');
        } catch (error) {
            log(`sendReport失败: ${error.message}`, 'error');

            // 方式2: 尝试使用sendFeatureReport
            try {
                await device.sendFeatureReport(0, data);
                log("命令已使用sendFeatureReport发送", 'success');
            } catch (featureError) {
                log(`sendFeatureReport也失败: ${featureError.message}`, 'error');
                throw new Error("所有发送方法都失败");
            }
        }
    } catch (error) {
        // log(`发送命令错误: ${error.message}`, 'error');
        console.error(`发送命令错误: ${error.message}`, 'error');
    }
}

// 将字符串转换为字节数组
function strToPayload(str) {
    return new TextEncoder().encode(str);
}

// 使用ASCII格式+Adler32校验发送命令 (基于Nreal Light的协议)
export async function sendNrealCommand(command) {
    if (!device || !device.opened) {
        log("设备未连接", 'error');
        return;
    }

    try {
        // 1. 将命令字符串转换为ASCII字节
        const cmdBytes = strToPayload(command);

        // 2. 计算Adler32校验和
        const checksum = adler32(cmdBytes);

        // 3. 构建完整数据包: [命令][校验和]
        const checksumBytes = new Uint8Array(4);
        checksumBytes[0] = (checksum >> 0) & 0xFF;
        checksumBytes[1] = (checksum >> 8) & 0xFF;
        checksumBytes[2] = (checksum >> 16) & 0xFF;
        checksumBytes[3] = (checksum >> 24) & 0xFF;

        const data = new Uint8Array(cmdBytes.length + 4);
        data.set(cmdBytes, 0);
        data.set(checksumBytes, cmdBytes.length);


        try {
            // 尝试使用sendReport
            await device.sendReport(0, data);
            log("Nreal格式命令已使用sendReport发送", 'success');
        } catch (error) {
            log(`Nreal格式sendReport失败: ${error.message}`, 'error');

            // 尝试使用sendFeatureReport
            try {
                await device.sendFeatureReport(0, data);
                log("Nreal格式命令已使用sendFeatureReport发送", 'success');
            } catch (featureError) {
                log(`Nreal格式sendFeatureReport也失败: ${featureError.message}`, 'error');
                throw new Error("所有发送方法都失败");
            }
        }
    } catch (error) {
        log(`发送Nreal格式命令错误: ${error.message}`, 'error');
    }
}
