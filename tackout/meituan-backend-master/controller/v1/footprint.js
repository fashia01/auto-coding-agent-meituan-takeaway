import BaseClass from '../../prototype/baseClass'
import FootprintModel from '../../models/v1/footprint'

class Footprint extends BaseClass {
    constructor() {
        super();
        this.addFootprint = this.addFootprint.bind(this);
        this.getFootprint = this.getFootprint.bind(this);
        this.deleteFootprint = this.deleteFootprint.bind(this);
    }

    // 添加足迹
    async addFootprint(req, res, next) {
        let {restaurant_id, restaurant} = req.body;
        let user_id = req.session.admin_id || req.session.user_id;

        console.log('=== 添加足迹 ===');
        console.log('user_id:', user_id);
        console.log('restaurant_id:', restaurant_id);
        console.log('restaurant:', restaurant);

        if (!restaurant_id || !restaurant) {
            res.send({
                status: -1,
                message: '添加足迹失败，参数有误'
            });
            return;
        }

        if (!user_id) {
            console.log('错误：user_id 不存在');
            res.send({
                status: -1,
                message: '添加足迹失败，用户未登录'
            });
            return;
        }

        try {
            // 检查是否已有足迹，有则更新浏览时间
            let existing = await FootprintModel.findOne({user_id, restaurant_id});

            if (existing) {
                existing.view_time = new Date();
                await existing.save();
                res.send({
                    status: 200,
                    message: '更新足迹成功'
                });
            } else {
                // 获取新的足迹ID
                let footprint_id = await this.getId('footprint_id');
                console.log('获取的footprint_id:', footprint_id);

                let data = {
                    id: footprint_id,
                    user_id,
                    restaurant_id,
                    restaurant,
                    view_time: new Date()
                };

                let footprint = await new FootprintModel(data).save();
                res.send({
                    status: 200,
                    message: '添加足迹成功'
                });
            }
        } catch (err) {
            console.log('添加足迹失败', err);
            res.send({
                status: -1,
                message: '添加足迹失败'
            });
        }
    }

    // 获取足迹列表
    async getFootprint(req, res, next) {
        let user_id = req.session.admin_id || req.session.user_id;

        try {
            let footprints = await FootprintModel.find({user_id}).sort({view_time: -1}).limit(50);

            // 格式化返回数据
            let data = footprints.map(item => ({
                id: item.id,
                restaurant_id: item.restaurant_id,
                restaurant: item.restaurant,
                view_time: item.view_time
            }));

            res.send({
                status: 200,
                message: '获取足迹成功',
                data: data
            });
        } catch (err) {
            console.log('获取足迹失败', err);
            res.send({
                status: -1,
                message: '获取足迹失败'
            });
        }
    }

    // 删除足迹
    async deleteFootprint(req, res, next) {
        let {id} = req.body;
        let user_id = req.session.admin_id || req.session.user_id;

        if (!id) {
            res.send({
                status: -1,
                message: '删除足迹失败，参数有误'
            });
            return;
        }

        try {
            let result = await FootprintModel.deleteOne({id, user_id});

            if (result && result.deletedCount > 0) {
                res.send({
                    status: 200,
                    message: '删除足迹成功'
                });
            } else {
                res.send({
                    status: -1,
                    message: '删除足迹失败'
                });
            }
        } catch (err) {
            console.log('删除足迹失败', err);
            res.send({
                status: -1,
                message: '删除足迹失败'
            });
        }
    }
}

export default new Footprint();
