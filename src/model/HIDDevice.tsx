// 添加接口定义在类的外部
interface HIDDeviceOriginal {
    vendorId?: number;
    productId?: number;
    productName?: string;
    manufacturerName?: string;
    collections?: Array<{
        outputReports?: Array<{
            items?: Array<{
                reportCount: number;
            }>;
        }>;
        inputReports?: Array<{
            items?: Array<{
                reportCount: number;
            }>;
        }>;
    }>;
    addEventListener: (eventName: string, callback: (event: any) => void) => void;
    removeEventListener: (eventName: string, callback: (event: any) => void) => void;
    hasListener?: boolean;

    sendReport(number: number, command: Uint8Array<ArrayBuffer>): void;
}

export class HIDDevice {
    constructor(
        public id: string = "",//我们业务中给他定义的一个Id,DEVICE本身不具备这个独立的ID,因为多个HID设备在XREAL中的序列号之类的都是一模一样的
        public vendorId: number,
        public productId: number,
        public productName: string,
        public manufacturerName: string,
        public originalInstance: HIDDeviceOriginal | null,
        public writeable: boolean = false,
        public readable: boolean = false,
    ) {
        this.id = id;
        this.vendorId = vendorId;
        this.productId = productId;
        this.productName = productName;
        this.manufacturerName = manufacturerName;
        this.originalInstance = originalInstance;
        this.writeable = writeable;
        this.readable = readable;

        if (!this.originalInstance) {
            throw new Error("原始实例不能为空");
        }
    }

    private boundHandleMessageReceived = this.handleMessageReceived.bind(this);

    //上次收到的报告
    private lastReport: Uint8Array | null = null;
    //上次收到报告的时间戳
    private lastReportTimestamp: number | null = null;

    //收到的消息的记录,最多保存1024条消息
    private messageHistory: string[] = [];

    //当收到的消息不是0xFD开头的有效数据包时,会触发这个事件
    public onMessageReceivedCallback: ((message: string, valid:boolean) => void) | undefined;

    static fromOriginalHIDDevice(obj: HIDDeviceOriginal): HIDDevice {
        const safeObj = obj || {} as HIDDeviceOriginal;
        return new HIDDevice(
            "",
            safeObj.vendorId || 0,
            safeObj.productId || 0,
            safeObj.productName || "未知设备",
            safeObj.manufacturerName || "未知制造商",
            safeObj,
            safeObj.collections?.[0]?.outputReports?.[0]?.items?.[0]?.reportCount > 0,
            safeObj.collections?.[0]?.inputReports?.[0]?.items?.[0]?.reportCount > 0,
        );
    }

    public toString(): string {
        return `HIDDevice: ${this.id}, 最后报告: ${this.lastReport}, 最后报告时间戳: ${this.lastReportTimestamp}, 消息历史: ${this.messageHistory}`;
    }

    public isValid(): boolean {
        // 判断设备是否有效, 这里可以根据设备的属性来判断
        return this.writeable
            && this.readable
            && this.lastReport !== null
            && this.lastReport.length > 0
            && this.lastReport[0] === 0xFD
    }

    public startListening(): void {
        //如果已经在监听了,就不再监听了
        if (this.originalInstance && this.originalInstance.hasListener) {
            console.warn("已经在监听了,不再添加监听器");
            return;
        }
        if (this.originalInstance) {
            this.originalInstance.addEventListener("inputreport", this.boundHandleMessageReceived);
            this.originalInstance.hasListener = true; // 标记为已开始监听
        }
    }

    public stopListening(): void {
        if (this.originalInstance) {
            console.warn("移除监听器之前已经添加的监听器:", this.boundHandleMessageReceived);
            this.originalInstance.removeEventListener("inputreport", this.boundHandleMessageReceived);
            this.originalInstance.hasListener = false; // 确保标记监听状态为已停止
            console.warn("停止监听,最后报告:", this.lastReport);
            console.warn("停止监听,最后报告时间戳:", this.lastReportTimestamp);
        }
    }

    private handleMessageReceived(event: { data: { buffer: ArrayBuffer } }): void {
        /// const {reportId, data} = event;
        const {data} = event;
        const dataView = new Uint8Array(data.buffer);
        const dataViewHex = Array.from(dataView).map((byte) => byte.toString(16).padStart(2, '0')).join(' ');

        console.log("收到HID数据报告:", dataViewHex);
        
        this.lastReport = dataView;
        this.lastReportTimestamp = Date.now();
        
        // console.log("更新lastReport:", this.lastReport);
        // console.log("更新lastReportTimestamp:", this.lastReportTimestamp);

        // 判断是否为0xFD开头的有效数据包
        const isValidFDReport = dataView.length > 0 && dataView[0] === 0xFD;

        if (isValidFDReport) {
            // 处理有效数据包
            const message = new TextDecoder().decode(dataView);
            this.messageHistory.push(message);
            if (this.messageHistory.length > 1024) {
                this.messageHistory.shift();
            }
            // 如果有回调函数,就调用它
            if (this.onMessageReceivedCallback) {
                this.onMessageReceivedCallback(message, true);
            }
        } else {
            // 处理无效数据包
            // console.warn("收到无效数据包:", dataView);
            const message = new TextDecoder().decode(dataView);
            this.messageHistory.push(message);
            if (this.messageHistory.length > 1024) {
                this.messageHistory.shift();
            }
            // 如果有回调函数,就调用它
            if (this.onMessageReceivedCallback) {
                this.onMessageReceivedCallback(message, false);
            }
        }
    }

    // 获取最后收到的报告
    public getLastReport(): Uint8Array | null {
        return this.lastReport;
    }

    // 获取最后报告时间戳
    public getLastReportTimestamp(): number | null {
        return this.lastReportTimestamp;
    }

    send(command: Uint8Array<ArrayBuffer>) {
        if (this.originalInstance) {
            // console.log("发送HID数据报告:", command);
            // this.originalInstance.sendReport(0, command);
        } else {
            console.error("原始实例不存在,无法发送数据");
        }
    }
}