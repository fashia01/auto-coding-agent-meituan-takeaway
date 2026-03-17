import BaseClass from '../../prototype/baseClass'
import CollectionModel from '../../models/v1/collection'

class Collection extends BaseClass {
    constructor() {
        super();
        this.addCollection = this.addCollection.bind(this);
        this.getCollection = this.getCollection.bind(this);
        this.deleteCollection = this.deleteCollection.bind(this);
    }

    // 添加收藏
    async addCollection(req, res, next) {
        let {restaurant_id, restaurant} = req.body;
        let user_id = req.session.admin_id || req.session.user_id;

        console.log('=== 添加收藏 ===');
        console.log('user_id:', user_id);
        console.log('restaurant_id:', restaurant_id);
        console.log('restaurant:', restaurant);

        if (!restaurant_id || !restaurant) {
            res.send({
                status: -1,
                message: '添加收藏失败，参数有误'
            });
            return;
        }

        if (!user_id) {
            console.log('错误：user_id 不存在');
            res.send({
                status: -1,
                message: '添加收藏失败，用户未登录'
            });
            return;
        }

        try {
            // 检查是否已收藏
            let existing = await CollectionModel.findOne({user_id, restaurant_id});

            if (existing) {
                res.send({
                    status: 200,
                    message: '该商家已收藏'
                });
                return;
            }

            // 获取新的收藏ID
            let collection_id = await this.getId('collection_id');
            console.log('获取的collection_id:', collection_id);

            let data = {
                id: collection_id,
                user_id,
                restaurant_id,
                restaurant,
                create_time: new Date()
            };

            let collection = await new CollectionModel(data).save();
            res.send({
                status: 200,
                message: '添加收藏成功'
            });
        } catch (err) {
            console.log('添加收藏失败', err);
            res.send({
                status: -1,
                message: '添加收藏失败'
            });
        }
    }

    // 获取收藏列表
    async getCollection(req, res, next) {
        let user_id = req.session.admin_id || req.session.user_id;

        try {
            let collections = await CollectionModel.find({user_id}).sort({create_time: -1}).limit(50);

            // 格式化返回数据
            let data = collections.map(item => ({
                id: item.id,
                restaurant_id: item.restaurant_id,
                restaurant: item.restaurant,
                create_time: item.create_time
            }));

            res.send({
                status: 200,
                message: '获取收藏成功',
                data: data
            });
        } catch (err) {
            console.log('获取收藏失败', err);
            res.send({
                status: -1,
                message: '获取收藏失败'
            });
        }
    }

    // 删除收藏
    async deleteCollection(req, res, next) {
        let {id, restaurant_id} = req.body;
        let user_id = req.session.admin_id || req.session.user_id;

        if (!id && !restaurant_id) {
            res.send({
                status: -1,
                message: '删除收藏失败，参数有误'
            });
            return;
        }

        try {
            let query = {user_id};
            if (id) {
                query.id = id;
            } else {
                query.restaurant_id = restaurant_id;
            }

            let result = await CollectionModel.deleteOne(query);

            if (result && result.deletedCount > 0) {
                res.send({
                    status: 200,
                    message: '取消收藏成功'
                });
            } else {
                res.send({
                    status: -1,
                    message: '取消收藏失败'
                });
            }
        } catch (err) {
            console.log('删除收藏失败', err);
            res.send({
                status: -1,
                message: '删除收藏失败'
            });
        }
    }
}

export default new Collection();
