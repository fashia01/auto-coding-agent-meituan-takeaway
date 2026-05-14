import fetch from 'node-fetch';
import Ids from '../models/ids'
import config from '../config'

export default class BaseClass {
  constructor() {
    this.tencentkey = config.tencentkey;
    this.tencentkey2 = config.tencentkey2;
    this.idList = ['restaurant_id', 'food_id', 'order_id', 'user_id', 'address_id', 'category_id', 'sku_id', 'admin_id', 'pay_id', 'comment_id', 'footprint_id', 'collection_id'];
  }

  async fetch(url = '', data = {}, type = 'GET', resType = 'JSON') {
    type = type.toUpperCase();
    resType = resType.toUpperCase();
    if (type == 'GET') {
      let dataStr = ''; //数据拼接字符串
      Object.keys(data).forEach(key => {
        dataStr += key + '=' + data[key] + '&';
      });

      if (dataStr !== '') {
        dataStr = dataStr.substr(0, dataStr.lastIndexOf('&'));
        url = url + '?' + dataStr;
      }
    }

    let requestConfig = {
      method: type,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
    }

    if (type == 'POST') {
      Object.defineProperty(requestConfig, 'body', {
        value: JSON.stringify(data)
      })
    }
    let responseJson;
    try {
      const response = await fetch(url, requestConfig);
      if (resType === 'TEXT') {
        responseJson = await response.text();
      } else {
        responseJson = await response.json();
      }
    } catch (err) {
      console.log('获取http数据失败', err);
      throw new Error(err)
    }
    return responseJson
  }

  //获取id列表
  async getId(type_id) {
    if (!this.idList.includes(type_id)) {
      throw new Error('id类型错误');
      return
    }
    try {
      console.log('getId - type_id:', type_id);
      const idData = await Ids.findOneAndUpdate({}, {'$inc': {[type_id]: 1}});
      console.log('getId - idData:', idData);
      console.log('getId - type_id value:', idData[type_id]);
      return ++idData[type_id];                //返回当前类型id数量*/
    } catch (err) {
      console.log('获取ID数据失败', err);
      throw new Error(err)
    }
  }

  //根据ip定位定位  只能获取到经纬度和省份城市  不能获取到具体位置 还需要调用下面接口获取具体位置
  async getLocation(req, res, next) {
    // 开发环境直接返回默认城市，跳过外部 API（避免 ENOTFOUND 错误）
    if (process.env.NODE_ENV == 'dev') {
      return {lat: 23.02067, lng: 113.75179, city: '东莞市'};
    }

    let ip = req.ip ||
             (req.connection && req.connection.remoteAddress) ||
             (req.socket && req.socket.remoteAddress) ||
             '';
    if (ip) {
      const ipArr = ip.split(':');   // 兼容 ::ffff:x.x.x.x 格式
      ip = ipArr[ipArr.length - 1];
    }
    // 取不到有效 IP，直接降级
    if (!ip || ip === '127.0.0.1' || ip === '::1') {
      return {lat: 23.02067, lng: 113.75179, city: '东莞市'};
    }

    try {
      let result;
      result = await this.fetch('http://apis.map.qq.com/ws/location/v1/ip', {
        ip,
        key: this.tencentkey,
      });
      if (result.status !== 0) {
        result = await this.fetch('http://apis.map.qq.com/ws/location/v1/ip', {
          ip,
          key: this.tencentkey2,
        })
      }
      if (result.status === 0) {
        const cityInfo = {
          lat: result.result.location.lat,
          lng: result.result.location.lng,
          city: result.result.ad_info.city,
        };
        cityInfo.city = cityInfo.city.replace(/市$/, '');
        return cityInfo;
      } else {
        return {lat: 23.02067, lng: 113.75179, city: '东莞市'};
      }
    } catch (err) {
      console.log('定位失败，使用默认位置', err.message || err);
      return {lat: 23.02067, lng: 113.75179, city: '东莞市'};
    }
  }

  //根据经纬度获取详细地址信息
  async getDetailPosition(location, res, successFn) {
    // 开发环境跳过外部 API，返回默认地址
    if (process.env.NODE_ENV == 'dev') {
      if (successFn) successFn({ address: '市体育路1号（默认）', location: location || {lat: 23.02067, lng: 113.75179} });
      return;
    }
    try {
      if (location) {
        let cityInfo = await this.fetch('http://apis.map.qq.com/ws/geocoder/v1', {
          location: location.lat + ',' + location.lng,
          key: this.tencentkey
        }, 'GET');
        let address = cityInfo.result.address.replace(/^.{2}省.{2}市/, '');
        successFn({
          address,
          location
        });
      }
    } catch (err) {
      console.log('获取位置失败', err.message || err);
      // 降级：返回默认地址而不是 500
      if (successFn) successFn({ address: '市体育路1号（定位失败）', location: location || {lat: 23.02067, lng: 113.75179} });
      else if (res) res.send({ status: -1, message: '获取定位失败' })
    }
  }

  //根据关键词搜索位置
  async locationSearch(keyword) {
    try {
      let reqData = {
        keyword: encodeURI(keyword),
        key: this.tencentkey,
        policy: 1
      }
      let data = await this.fetch('http://apis.map.qq.com/ws/place/v1/suggestion', reqData, "GET");
      return data;
    } catch (err) {
      console.log('搜索位置出错', err);

    }
  }
}