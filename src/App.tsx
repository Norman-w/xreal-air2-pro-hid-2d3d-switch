import {useState} from 'react'
import './App.css'
import HIDDeviceInterfaceSelector from "./HIDDeviceInterfaceSelector.tsx";
import {HIDDevice} from "./model/HIDDevice.tsx";
import {DeviceHelper} from "./core/DeviceHelper.tsx";
import styled from "styled-components";
import {buildCustomDisplayCommand} from "./core/command_builder.tsx";

const SwitchTo3DButton = styled.button`
    font-size: 44px;
    border: none;
    border-radius: 14px;
    color: #fff;
    cursor: pointer;
    /*充满渴望的灰色*/
    background-color: #808080;
    transition: background-color 0.5s ease;
    &:hover {
        /*充满渴望的绿色*/
        background-color: #03c03c;
    }
    width: 600px;
    height: 200px;
`;
const SwitchTo2DButton = styled.button`
    padding: 60px 120px;
    border: none;
    border-radius: 14px;
    color: #309ac3;
    font-size: 44px;
    cursor: pointer;
    /*欢乐的绿色*/
    background-color: #008000;
    transition: background-color 0.5s ease;
    /*赛博朋克风粉色和蓝色相间的阴影效果,内发光蓝色外发光粉色*/
    text-shadow: 0 0 10px #00f,0 0 20px #00f,
    0 0 30px #00f,
    0 0 200px #3c0080,0 0 100px #ff0080,
    0 0 100px #923f80;

    &:hover {
        /*忧伤的灰色*/
        background-color: #333;
        color: #666;
        text-shadow: 0 0 10px #666, 0 0 20px #666;
    }

    width: 600px;
    height: 200px;
`;

function App() {
    const [mode, setMode] = useState('2D')
    // const [device, setDevice] = useState<HIDDevice | null>(null)
    const [connected, setConnected] = useState(false)
    const [hidListForThisDevice, setHidListForThisDevice] = useState<HIDDevice[]>([])
    const [currentConnectedInterface, setCurrentConnectedInterface] = useState<HIDDevice | null>(null)
    const [buttonText, setButtonText] = useState('当前工作在2D模式')
    const handleSwitchTo3D = () => {
        if (currentConnectedInterface) {
            console.info("发送3D模式命令")
            const command = buildCustomDisplayCommand({msgId:0x004})
            console.info("3D模式命令:", command)
            currentConnectedInterface.send(command)
            setMode('3D')
            setButtonText('当前工作在3D模式')
        }
    }
    const handleSwitchTo2D = () => {
        if (currentConnectedInterface) {
            // currentConnectedInterface.sendReport(0, new Uint8Array([0x00, 0x00, 0x00, 0x00]))
            setMode('2D')
            setButtonText('当前工作在2D模式')
        }
    }
    return (
        <>
            <header>XReal Air2 Pro 2D/3D模式切换</header>
            {/*打开HID设备,使用WebHID, 先列出设备列表,然后根据设备的HID设备集(XREAL有4个HID设备)选择一个设备,然后打开设备*/}
            <div className="card">
                {!connected && <HIDDeviceInterfaceSelector
                    onStartFetching={() => {
                        setHidListForThisDevice([])
                    }}
                    onFinishedFetching={(devices: HIDDevice[]) => {
                        setHidListForThisDevice(devices)
                    }}
                    onDeviceSelected={(device: HIDDevice) => {
                        // setDevice(device)
                        console.info("选择的设备:", device)
                        setConnected(true)
                        setCurrentConnectedInterface(device)
                    }}
                    onClickedAutoSelect={() => {
                        //自动选择设备, 需要根据设备的VID和PID来选择
                        const validateDevices = DeviceHelper.validateDevices(hidListForThisDevice)
                        validateDevices.then((devices) => {
                            if (devices.length > 0) {
                                // setDevice(devices[0])
                                console.info("找到有效的设备数量:", devices.length)
                                if (devices.length > 1) {
                                    alert('找到多个有效的设备,请手动选择一个')
                                }
                                // setDevice(devices[0])
                                const destDevice = devices[0]
                                console.info("自动选择的设备:", destDevice)
                                setConnected(true)
                                setCurrentConnectedInterface(destDevice)
                                destDevice.startListening()
                                console.info("开始监听设备数据")
                            } else {
                                alert('没有找到有效的设备')
                            }
                        })
                    }}/>
                }
                {connected && <div className="card">
                    <h2 style={{color: "darkgreen"}}>已通过接口 [{currentConnectedInterface?.id}] 进行连接</h2>
                    {mode === '2D' && (
                        <SwitchTo3DButton
                            onMouseEnter={() => setButtonText('点击切换到3D模式')} // 鼠标悬浮
                            onMouseLeave={() => setButtonText('当前工作在2D模式')} // 鼠标离开
                            onClick={handleSwitchTo3D} // 切换到 3D 模式
                        >
                            {buttonText}
                        </SwitchTo3DButton>
                    )}
                    {mode === '3D' && (
                        <SwitchTo2DButton
                            onMouseEnter={() => setButtonText('点击切换到2D模式')} // 鼠标悬浮
                            onMouseLeave={() => setButtonText('当前工作在3D模式')} // 鼠标离开
                            onClick={handleSwitchTo2D} // 切换到 2D 模式
                        >
                            {buttonText}
                        </SwitchTo2DButton>
                    )}
                </div>}
            </div>
        </>
    )
}

export default App
