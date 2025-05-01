
// 连接设备
export async function connectDevice() {
    try {
        if (!navigator.hid) {
            throw new Error("WebHID API不可用。请使用支持WebHID的浏览器，如Chrome。");
        }

        if (deviceConnected) {
            log('设备已连接，请先断开连接', 'warning');
            return;
        }

        log('应用已准备就绪。请连接XREAL眼镜。', 'info');

        // 请求HID设备访问权限
        log('正在请求HID设备访问权限...', 'info');

        // 设置首选接口
        const advancedOptions = document.getElementById('advancedOptions');
        if (advancedOptions) {
            prefInterfaceMode = advancedOptions.value || 'auto';
            log(`设置首选接口为: ${prefInterfaceMode}`, 'info');
        }

        // 请求设备
        try {
            devices = await navigator.hid.requestDevice({
                filters: [{
                    vendorId: XREAL_VENDOR_ID
                }]
            });

            if (devices.length === 0) {
                log('未选择设备', 'error');
                return;
            }

            selectedDevice = devices[0];
            log(`已选择设备: ${selectedDevice.productName} (vendorId: 0x${selectedDevice.vendorId.toString(16)}, productId: 0x${selectedDevice.productId.toString(16)})`, 'success');

            // 打开设备连接
            if (!selectedDevice.opened) {
                await selectedDevice.open();
            }
            log('设备已打开', 'success');

            // 设置输入报告监听器
            selectedDevice.addEventListener('inputreport', handleInputReport);
            log('已设置输入报告监听器', 'success');

            // 更新界面状态
            deviceConnected = true;
            document.getElementById('connectBtn').textContent = '断开连接';

            // 探测设备接口
            log('正在枚举设备接口...', 'info');
            await scanAllInterfaces();

            // 如果找到了控制接口，启用功能按钮
            if (controlInterfaceId !== -1) {
                log(`使用接口ID ${controlInterfaceId} 作为主控接口`, 'success');

                // 启用功能按钮
                document.getElementById('mode2DBtn').disabled = false;
                document.getElementById('mode3DBtn').disabled = false;
                document.getElementById('alternateMode3DBtn').disabled = false;
                document.getElementById('mode3DWithID8Btn').disabled = false;
                document.getElementById('mode2DWithID8Btn').disabled = false;
                document.getElementById('mode3D72HzBtn').disabled = false;
                document.getElementById('mode3D120HzBtn').disabled = false;
                document.getElementById('simulateNebulaBtn').disabled = false;
                document.getElementById('sdkWorksBtn').disabled = false;
                document.getElementById('sendHeartbeatBtn').disabled = false;
                document.getElementById('scanAllBtn').disabled = false;
                document.getElementById('interfaceSelector').disabled = false;

                // 启用亮度控制按钮
                document.querySelectorAll('.brightness-btn').forEach(btn => {
                    btn.disabled = false;
                });
                document.getElementById('bestBrightnessBtn').disabled = false;
                document.getElementById('testAllBrightnessIdsBtn').disabled = false;

                // 启用参数测试面板按钮
                document.getElementById('testMode1Btn').disabled = false;
                document.getElementById('testMode2Btn').disabled = false;
                document.getElementById('testMode3Btn').disabled = false;
                document.getElementById('testMode4Btn').disabled = false;
                document.getElementById('testMode5Btn').disabled = false;

                document.getElementById('testSubMode1Btn').disabled = false;
                document.getElementById('testSubMode2Btn').disabled = false;
                document.getElementById('testSubMode3Btn').disabled = false;
                document.getElementById('testSubMode4Btn').disabled = false;

                document.getElementById('testRefresh60Btn').disabled = false;
                document.getElementById('testRefresh72Btn').disabled = false;
                document.getElementById('testRefresh90Btn').disabled = false;
                document.getElementById('testRefresh120Btn').disabled = false;

                document.getElementById('testCombo1Btn').disabled = false;
                document.getElementById('testCombo2Btn').disabled = false;
                document.getElementById('testCombo3Btn').disabled = false;
                document.getElementById('testCombo4Btn').disabled = false;

                document.getElementById('testMsgId1Btn').disabled = false;
                document.getElementById('testMsgId2Btn').disabled = false;
                document.getElementById('testMsgId3Btn').disabled = false;
                document.getElementById('testMsgId4Btn').disabled = false;

                document.getElementById('testRes1Btn').disabled = false;
                document.getElementById('testRes2Btn').disabled = false;
                document.getElementById('testRes3Btn').disabled = false;
                document.getElementById('testRes4Btn').disabled = false;
            } else {
                log('未找到有效控制接口，部分功能将不可用', 'warning');
            }

            // 尝试发送一个心跳命令
            await sendHeartbeat();
        } catch (error) {
            log(`WebHID请求设备失败: ${error.message}`, 'error');
            throw error;
        }

    } catch (error) {
        log(`连接设备时出错: ${error.message}`, 'error');
        await disconnectDevice();
    }
}

// 断开设备连接
export async function disconnectDevice() {
    try {
        if (!deviceConnected) {
            return;
        }

        // 移除事件监听器
        if (selectedDevice) {
            selectedDevice.removeEventListener('inputreport', handleInputReport);

            // 关闭设备连接
            if (selectedDevice.opened) {
                await selectedDevice.close();
            }
        }

        log('已断开设备连接', 'info');

        // 重置状态
        selectedDevice = null;
        deviceConnected = false;
        controlInterfaceId = -1;
        interfaceFeatures = {};

        // 清空接口选择器
        const interfaceSelector = document.getElementById('interfaceSelector');
        while (interfaceSelector.options.length > 2) {
            interfaceSelector.remove(2);
        }

        // 更新界面状态
        document.getElementById('connectBtn').textContent = '连接XREAL眼镜';

        // 禁用功能按钮
        document.getElementById('mode2DBtn').disabled = true;
        document.getElementById('mode3DBtn').disabled = true;
        document.getElementById('alternateMode3DBtn').disabled = true;
        document.getElementById('mode3DWithID8Btn').disabled = true;
        document.getElementById('mode2DWithID8Btn').disabled = true;
        document.getElementById('mode3D72HzBtn').disabled = true;
        document.getElementById('mode3D120HzBtn').disabled = true;
        document.getElementById('simulateNebulaBtn').disabled = true;
        document.getElementById('sdkWorksBtn').disabled = true;
        document.getElementById('sendHeartbeatBtn').disabled = true;
        document.getElementById('scanAllBtn').disabled = true;
        document.getElementById('interfaceSelector').disabled = true;

        // 禁用亮度控制按钮
        document.querySelectorAll('.brightness-btn').forEach(btn => {
            btn.disabled = true;
        });
        document.getElementById('testAllBrightnessIdsBtn').disabled = true;

        // 禁用参数测试面板按钮
        document.getElementById('testMode1Btn').disabled = true;
        document.getElementById('testMode2Btn').disabled = true;
        document.getElementById('testMode3Btn').disabled = true;
        document.getElementById('testMode4Btn').disabled = true;
        document.getElementById('testMode5Btn').disabled = true;

        document.getElementById('testSubMode1Btn').disabled = true;
        document.getElementById('testSubMode2Btn').disabled = true;
        document.getElementById('testSubMode3Btn').disabled = true;
        document.getElementById('testSubMode4Btn').disabled = true;

        document.getElementById('testRefresh60Btn').disabled = true;
        document.getElementById('testRefresh72Btn').disabled = true;
        document.getElementById('testRefresh90Btn').disabled = true;
        document.getElementById('testRefresh120Btn').disabled = true;

        document.getElementById('testCombo1Btn').disabled = true;
        document.getElementById('testCombo2Btn').disabled = true;
        document.getElementById('testCombo3Btn').disabled = true;
        document.getElementById('testCombo4Btn').disabled = true;

        document.getElementById('testMsgId1Btn').disabled = true;
        document.getElementById('testMsgId2Btn').disabled = true;
        document.getElementById('testMsgId3Btn').disabled = true;
        document.getElementById('testMsgId4Btn').disabled = true;

        document.getElementById('testRes1Btn').disabled = true;
        document.getElementById('testRes2Btn').disabled = true;
        document.getElementById('testRes3Btn').disabled = true;
        document.getElementById('testRes4Btn').disabled = true;

    } catch (error) {
        log(`断开设备连接时出错: ${error.message}`, 'error');
    }
}

// 列出所有HID设备的函数
export async function listAllHIDDevices() {
    log("正在尝试获取所有连接的HID设备...", 'info');

    try {
        // 使用空过滤器请求所有HID设备
        const devices = await navigator.hid.requestDevice({ filters: [] });

        if (devices.length === 0) {
            log("未选择任何设备", 'error');
            return;
        }

        log(`发现 ${devices.length} 个HID设备:`, 'success');

        // 显示每个设备的详细信息
        devices.forEach((dev, index) => {
            log(`设备 ${index+1}:`, 'info');
            log(`  名称: ${dev.productName}`, 'info');
            log(`  厂商ID: 0x${dev.vendorId.toString(16).padStart(4, '0')}`, 'info');
            log(`  产品ID: 0x${dev.productId.toString(16).padStart(4, '0')}`, 'info');
            log(`  版本: ${dev.version || '未知'}`, 'info');

            if (dev.collections && dev.collections.length > 0) {
                log(`  接口信息:`, 'info');
                dev.collections.forEach((collection, i) => {
                    log(`    接口 ${i}: usagePage=${collection.usagePage}, usage=${collection.usage}`, 'info');
                    if (collection.inputReports && collection.inputReports.length > 0) {
                        log(`      输入报告: ${collection.inputReports.map(r => r.reportId).join(', ')}`, 'info');
                    }
                    if (collection.outputReports && collection.outputReports.length > 0) {
                        log(`      输出报告: ${collection.outputReports.map(r => r.reportId).join(', ')}`, 'info');
                    }
                });
            }

            log(`  ----------------------------------`, 'info');
        });

        // 提供选择设备的选项
        log("您可以通过连接按钮连接上述设备", 'info');

    } catch (error) {
        log(`获取设备列表错误: ${error.message}`, 'error');
    }
}


// 探测设备接口
async function scanAllInterfaces() {
    if (!selectedDevice || !selectedDevice.opened) {
        log("设备未连接，无法扫描接口", 'error');
        return;
    }

    log("开始扫描设备接口(ID 0-10)...", 'info');

    try {
        // 测试接口0作为默认控制接口
        controlInterfaceId = 0;

        // 发送心跳命令测试接口
        try {
            const heartbeatCmd = new Uint8Array([0xFD, 0x76]);
            await selectedDevice.sendReport(controlInterfaceId, heartbeatCmd);
            log(`已发送心跳到接口ID ${controlInterfaceId}`, 'success');

            // 记录接口支持输出
            interfaceFeatures[controlInterfaceId] = {
                supportsOutput: true
            };
        } catch (error) {
            log(`接口${controlInterfaceId}不支持输出: ${error.message}`, 'error');
            controlInterfaceId = -1;
        }

        // 如果测试成功，就返回
        if (controlInterfaceId !== -1) {
            log(`使用接口ID ${controlInterfaceId} 作为主控接口`, 'success');
            return;
        }

        // 否则尝试其他接口
        for (let id = 1; id <= 10; id++) {
            try {
                const heartbeatCmd = new Uint8Array([0xFD, 0x76]);
                await selectedDevice.sendReport(id, heartbeatCmd);
                log(`接口ID ${id} 支持输出`, 'success');

                // 记录接口信息并设为控制接口
                interfaceFeatures[id] = {
                    supportsOutput: true
                };
                controlInterfaceId = id;
                break;
            } catch (error) {
                log(`接口ID ${id} 不支持输出: ${error.message}`, 'info');
            }
        }

        // 如果找到了控制接口
        if (controlInterfaceId !== -1) {
            log(`使用接口ID ${controlInterfaceId} 作为主控接口`, 'success');
        } else {
            log("未找到可用的控制接口", 'error');
        }

    } catch (error) {
        log(`扫描接口时出错: ${error.message}`, 'error');
    }
}

