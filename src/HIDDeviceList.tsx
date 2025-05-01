import {useState} from 'react';
import styled from 'styled-components';
import {HIDDevice} from "./model/HIDDevice.tsx";

const DeviceList = styled.div`
    padding: 16px;
`;

const DeviceItem = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-bottom: 12px;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 6px;
    background-color: #333;
    gap: 10px;
`;

const DeviceName = styled.span`
    font-size: 16px;
    font-weight: bold;
    margin-right: 10px;
`;

const DeviceInfo = styled.span`
    font-size: 14px;
    color: #999;
`;

const FetchButton = styled.button`
    padding: 8px 16px;
    margin-bottom: 16px;
    border: none;
    border-radius: 4px;
    background-color: #007bff;
    color: #fff;
    font-size: 14px;
    cursor: pointer;

    &:hover {
        background-color: #0056b3;
    }
`;

const ConnectButton = styled.button`
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    color: #fff;
    font-size: 12px;
    cursor: pointer;

    &:hover {
        background-color: #022222;
    }
`;

const ReadIcon = styled.div`
    font-size: 11px;
    font-weight: bold;
    width: 16px;
    height: 16px;
    background-color: #007bff;
    border-radius: 50%;
    text-align: center;
`;
const WriteIcon = styled.div`
    font-size: 11px;
    font-weight: bold;
    width: 16px;
    height: 16px;
    background-color: #822039;
    border-radius: 50%;
    text-align: center;
`;

const AutoSelectButton = styled.button`
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    background-color: #dda800;
    color: #000;
    font-size: 12px;
    cursor: pointer;

    &:hover {
        background-color: #ddc107;
    }
`;

const HIDDeviceList = ({
                           onStartFetching,
                            onFinishedFetching,
                           onDeviceSelected,
                           onClickedAutoSelect,
                       }: {
    onStartFetching: () => void;
    onFinishedFetching: (devices: HIDDevice[]) => void;
    onDeviceSelected: (device: HIDDevice) => void;
    //当点击自动选择时,需要外面处理具体应该选择哪个设备
    onClickedAutoSelect: () => void;
}) => {
    const [devices, setDevices] = useState<HIDDevice[]>([]);

    const handleFetchDevices = async () => {
        onStartFetching();
        try {
            let deviceIndex = 0;
            const availableDevices = await navigator.hid.requestDevice({filters: [{vendorId: 0x3318}]});
            const devicesList = availableDevices.map((deviceOriginal: any) => {
                    const device = HIDDevice.fromOriginalHIDDevice(deviceOriginal)
                    device.id = deviceIndex + "-" + device.vendorId + "-" + device.productId
                    deviceIndex++;
                    return device;
                }
            );
            setDevices(devicesList);
            onFinishedFetching(devicesList);
        } catch (error) {
            console.error('Failed to fetch devices:', error);
        }
    };

    return (
        <DeviceList>
            <FetchButton onClick={handleFetchDevices} aria-label="Fetch HID devices">
                选择 HID 设备
            </FetchButton>
            {devices.map((device, index) => (
                <DeviceItem key={`${index}-${device.vendorId}-${device.productId}`}>
                    {/*先输出json看一下结构*/}
                    {/*<pre>{JSON.stringify(device.originalInstance, null, 2)}</pre>*/}
                    <DeviceName>{device.productName || '未知设备'}</DeviceName>
                    <DeviceInfo>{device.manufacturerName || '未知制造商'}</DeviceInfo>
                    <div>
                        {device.readable && <ReadIcon>读</ReadIcon>}
                        {device.writeable && <WriteIcon>写</WriteIcon>}
                    </div>
                    <ConnectButton onClick={() => onDeviceSelected(device)}>
                        通过该子设备(接口)打开
                    </ConnectButton>
                </DeviceItem>
            ))}
            {devices.length > 0 && (
                <AutoSelectButton onClick={onClickedAutoSelect} aria-label="Auto select HID device">
                    自动选择正确的 HID 设备
                </AutoSelectButton>
            )}
        </DeviceList>
    );
};

export default HIDDeviceList;