import {HIDDevice} from "../model/HIDDevice.tsx";
import {sendCommand, sendNrealCommand} from "../glasses_io.tsx";

export class DeviceHelper {
    // Static method to monitor and validate devices
    static async validateDevices(devices: HIDDevice[]): Promise<HIDDevice[]> {
        //尝试给每个设备发一条消息
        for (const device of devices) {
            const originalInstance = device.originalInstance;
            if (!originalInstance) {
                console.error(`Device ${device.device.productId} does not have an original instance.`);
                continue;
            }
            const opened = originalInstance.opened;
            if (!opened) {
                // Attempt to open the device
                try {
                    await originalInstance.open();
                } catch (error) {
                    console.error(`Failed to open device ${device.device.productId}:`, error);
                    continue;
                }
            }
            //开始监听
            device.startListening();
            //发送消息
            sendCommand(originalInstance,"v")
            // sendNrealCommand("v")
        }
        //等待1秒钟
        await new Promise(resolve => setTimeout(resolve, 1000));
        //移除所有监听器
        for (const device of devices) {
            device.stopListening();
        }
        //检查设备是否有效
        return devices.filter(device => device.isValid());
    }
}