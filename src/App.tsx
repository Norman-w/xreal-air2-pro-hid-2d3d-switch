import {useState} from 'react'
import './App.css'
import HIDDeivcesList from "./HIDDeviceInterfaceSelector.tsx";
import {HIDDevice} from "./model/HIDDevice.tsx";
import {DeviceHelper} from "./core/DeviceHelper.tsx";

function App() {
    // const [count, setCount] = useState(0)
    const [mode, setMode] = useState('2D')
    const [device, setDevice] = useState<HIDDevice | null>(null)
    const [connected, setConnected] = useState(false)
    const [hidListForThisDevice, setHidListForThisDevice] = useState<HIDDevice[]>([])
    const [selectedHid, setSelectedHid] = useState(null)
    return (
        <>
            <header>XReal Air2 Pro 2D/3D模式切换</header>
            {/*打开HID设备,使用WebHID, 先列出设备列表,然后根据设备的HID设备集(XREAL有4个HID设备)选择一个设备,然后打开设备*/}
            <div className="card">
                <HIDDeivcesList
                    onStartFetching={() => {
                    setHidListForThisDevice([])
                }}
                onFinishedFetching={(devices: HIDDevice[]) => {
                    setHidListForThisDevice(devices)
                }}
                onDeviceSelected={(device : HIDDevice) => {
                    setDevice(device)
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
                            setDevice(devices[0])
                        } else {
                            alert('没有找到有效的设备')
                        }
                    })
                }} />
            </div>
            <div className="card">
                <button onClick={() => {
                    if (mode === '2D') {
                        setMode('3D')
                    } else {
                        setMode('2D')
                    }
                }}>
                    {mode}
                </button>
            </div>
        </>
    )
}

export default App
