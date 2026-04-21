import express from 'express';
import Cites from '../controller/v1/cites';
import Restaurant from '../controller/v1/restaurant';
import Order from '../controller/v1/order';
import Comment from '../controller/v1/comment';
import Coupon from '../controller/v1/coupon';
import Foods from '../controller/v1/foods';
import Pay from '../controller/v1/pay';
import Footprint from '../controller/v1/footprint';
import Collection from '../controller/v1/collection';
import Auth from '../controller/admin/auth';
import Category from '../models/v1/category';
import Ai from '../controller/v1/ai';

const router = express.Router();
router.get('/suggestion', Cites.suggestion);               //地址位置搜索
router.get('/location', Cites.location);                 //定位
router.get('/detailLocation', Cites.detailLocation);  // 根据lat，lng获取详情位置
router.get('/restaurants', Restaurant.getRestaurants);       //获取多家餐馆
router.get('/all_restaurant', Auth.authAdmin, Restaurant.allRestaurant); // 获取全部餐馆
router.get('/my_category', Auth.authAdmin, Restaurant.getMyCategory); // 获取我的分类
router.post('/update_category', Auth.authAdmin, Restaurant.updateCategory); // 更新category分类
router.delete('/category', Auth.authAdmin, Restaurant.deleteCategory);  // 删除分类
router.get('/restaurant/:restaurant_id', Restaurant.getRestaurant);          //获取指定餐馆信息
router.post('/restaurant', Auth.authAdmin, Restaurant.addRestaurant);          //添加商家
router.get('/search/restaurant', Restaurant.searchRestaurant);  //搜索商家
router.get('/my_restaurant', Auth.authAdmin, Restaurant.myRestaurant);      //获取我的餐馆

router.post('/category', Foods.addCategory);         //添加食物分类
router.get('/category/:restaurant_id', Restaurant.getCategory);    //获取指定餐馆食物分类

router.post('/food', Auth.authAdmin, Foods.addFood);         //添加食物

router.get('/food/:restaurant_id', Restaurant.getFoods);         //获取指定餐馆食物列表
router.get('/my_foods',Auth.authAdmin, Restaurant.getMyFoods);     // 获取我的餐馆食物
router.delete('/food/:food_id', Auth.authAdmin, Foods.deleteFood);      //删除食物
router.post('/update_foods', Auth.authAdmin, Foods.updateFoods);      // 更新食物

//评价
router.get('/comment', Comment.getComment);     //获取餐馆评论
router.post('/comment', Auth.authUser, Comment.makeComment);        //评论
router.post('/_comment', Comment._makeComment);      //添加评论
router.get('/my_comment', Auth.authUser, Comment.myComment);        //获取我的评论
router.get('/comment_count', Comment.commentCount);      //获取评论数量
router.get('/my_restaurant_comment', Auth.authAdmin, Comment.myRestaurantComment);     //获取我的餐馆评论
router.delete('/comment', Auth.authUser, Comment.deleteComment);              //删除评论
router.post('/reply_comment', Auth.authAdmin, Comment.replyComment);   // 商家回复评论
//订单
router.post('/order', Auth.auth, Order.makeOrder);         //下订单
router.post('/wxorder', Auth.auth, Order.makeWXOrder);     // 下微信订单
router.get('/orders', Auth.auth, Order.getOrders);             //获取订单列表
router.get('/my_restaurant_order', Auth.authAdmin, Order.getMyRestaurantOrder); // 获取我的餐馆订单
router.get('/order/:order_id', Auth.auth, Order.getOrder);             //获取指定订单
router.post('/order_confirm', Auth.authAdmin, Order.confirmOrder);         // 商家确认订单

//支付
router.post('/pay', Auth.auth, Pay.initPay);                    //初始化支付
router.post('/notify_url', Pay.payNotice);            //支付异步通知
router.get('/listen_status', Auth.auth, Pay.listenStatus);          //监听扫描结果

//足迹
router.post('/footprint', Auth.authUser, Footprint.addFootprint);        //添加足迹
router.get('/footprint', Auth.authUser, Footprint.getFootprint);        //获取足迹列表
router.delete('/footprint', Auth.authUser, Footprint.deleteFootprint);   //删除足迹

//收藏
router.post('/collection', Auth.authUser, Collection.addCollection);        //添加收藏
router.get('/collection', Auth.authUser, Collection.getCollection);        //获取收藏列表
router.delete('/collection', Auth.authUser, Collection.deleteCollection);   //删除收藏

// AI 对话
router.post('/ai/chat', Ai.aiChat);   // AI 智能推荐（SSE 流式）

// 优惠券
router.get('/coupon/available', Auth.authUser, Coupon.getAvailableCoupons);   // 获取可用优惠券
router.get('/coupon/mine', Auth.authUser, Coupon.getUserCoupons);              // 我的优惠券
router.post('/coupon/claim', Auth.authUser, Coupon.claimCoupon);              // 领取优惠券

export default router;
