module.exports = {
    port: 3000,         //启动端口
    DB_URL: 'mongodb://127.0.0.1:27017/takeaway',    //数据库地址
    notifyUrl: 'http://39.108.3.12:3000/v1/notify_url',      //支付异步通知地址
    synNotifyUrl: 'http://39.108.3.12',              //客户端同步跳转
    sessionStorageURL: 'mongodb://127.0.0.1:27017/session',   //数据库存放session地址
    Bucket: 'meituan',   //七牛云bucket
    AccessKey: '',   //七牛云accessKey
    SecretKey: '',    //七牛云secretKey
    tencentkey: 'BESBZ-5MFL4-4KWU2-FOJCY-IGSHO-7JBXT',        //腾讯位置secreKey
    tencentkey2: 'BESBZ-5MFL4-4KWU2-FOJCY-IGSHO-7JBXT',        //腾讯位置服务secreKey
    wechatAppid: '',  // 微信小程序appid
    wecahatSecret: '', // 微信小程序密钥
    mockPayment: true,  // 模拟支付模式，设为true时跳过真实支付接口

    // 订单状态推进时间常量（毫秒）
    ORDER_ACCEPT_DELAY: 2000,       // 支付成功 → 商家接单
    ORDER_PREPARE_DELAY: 30000,     // 接单 → 备餐中
    ORDER_DELIVER_DELAY: 60000,     // 备餐 → 配送中
    ORDER_DONE_DELAY: 120000        // 配送中 → 已完成
};


