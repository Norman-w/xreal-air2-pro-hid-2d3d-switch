# XReal Air2 Pro VR眼镜的2D/3D模式切换
使用WebHID来实现VR眼镜的2D/3D模式切换


### 分析和实现步骤
* 借助`/Applications/Nebula for Mac.app/Contents/PlugIns/libnr_glasses_api.dylib`, `libnr_api.dylib`分析到的可能API以及Hopper Disassembler的分析,找到可能的函数
* 使用Cursor的claude 3.7 sonnet模型帮助分析,猜出大概的要给眼镜发送的HID的HEX数据包
* 使用C#的HIDSharp库, 检测眼镜相关的设备,测试哪个是正常用于上位机和眼镜MCU通讯的设备接口(该眼镜有4个HID设备)
* 直接调用2D/3D切换接口无果,转而测试看亮度控制,结果控制亮度时,眼镜的3D/2D模式竟然切换了,证明我们调查的crc的方法是有效的,控制方法也是对的,需要进一步的验证如何控制真正我们需要的2D/3D模式切换功能

### 项目说明
* React + TypeScript + Vite
* Node 20.19.0


# 2025年05月01日22:56:03实现最终目标

🏆 正确的切换2D/3D模式命令:
`参考buildCustomDisplayCommand({msgId:0x008, mode: 3})`
* 3为切换为3D模式(电脑和XREAL复刻都为3840*1080)
* 1为切换到正常模式(电脑和XREAL复刻都为1920*1080)
* 4为切换为XREAL作为电脑的拓展屏使用3D模式(电脑保持它自己的分辨率,XREAL变为3840*1080分辨率)
🏆

虽然不完美也没有整理代码,但是至少我们功能实现了.三十几个小时的努力有了收获,奖励自己补充一下前两天不足的睡眠先.😴
