<!--我的收藏-->
<template>
  <div id="collection">
    <v-head goBack="true" title="我的收藏"></v-head>

    <div class="scroll-container">
      <div class="empty-container" v-show="!collectionList.length">
        <img src="../../../assets/nothing.png">
        <span class="text">还没有收藏的商家</span>
        <p class="tip">快去发现喜欢的美食吧</p>
      </div>

      <div class="userinfo" v-show="collectionList.length">
        <div class="avatar">
          <img :src="userInfo.avatar">
        </div>
        <h3 class="username">{{userInfo.username}}</h3>
        <span class="collection-count">已收藏{{collectionList.length}}家店铺</span>
      </div>

      <article v-for="(item,index) in collectionList" :key="item.id" @click="goToStore(item.restaurant_id)">
        <div class="title">
          <div class="restaurant-info">
            <span class="icon"><img :src="item.restaurant && item.restaurant.pic_url"></span>
            <span class="name">{{item.restaurant && item.restaurant.name}}</span>
          </div>
          <span class="right"><i class="iconfont">&#xe6d7;</i></span>
        </div>
        <div class="main-container">
          <div class="avatar">
            <img :src="item.restaurant && item.restaurant.pic_url">
          </div>
          <div class="info-container">
            <div class="top margin-2">
              <span class="name">{{item.restaurant && item.restaurant.name}}</span>
              <span class="time">{{item.create_time ? item.create_time.slice(0, 10) : ''}}</span>
            </div>
            <div class="score margin-2">
              <star :score="item.restaurant ? item.restaurant.wm_poi_score : 0"></star>
              <span class="delivery">{{item.restaurant && item.restaurant.delivery_time_tip || '美团快送'}}</span>
            </div>
            <div class="bottom margin-2">
              <span class="delete" @click.stop="deleteCollection(item.id,index)"><i class="iconfont">&#xe615;</i> 取消收藏</span>
            </div>
          </div>
        </div>
      </article>
    </div>
    <alert-tip :text="alertText" :showTip.sync="showTip"></alert-tip>
  </div>
</template>

<script>
  import {userInfo, getCollection, deleteCollection as deleteCollectionApi} from '@/api/user'
  import star from '@/components/star'

  export default {
    components: {
      star
    },
    data() {
      return {
        userInfo: {},
        collectionList: [],
        alertText: '',
        showTip: false
      }
    },
    methods: {
      deleteCollection(id, index) {
        deleteCollectionApi({id}).then((response) => {
          let res = response.data;
          if (res.status === 200) {
            this.alertText = '取消收藏成功';
            this.showTip = true;
            this.collectionList.splice(index, 1)
          } else {
            this.alertText = res.message || '取消收藏失败';
            this.showTip = true;
          }
        })
      },
      goToStore(restaurantId) {
        this.$router.push({path: '/store', query: {id: restaurantId}})
      }
    },
    created() {
      userInfo().then((response) => {
        let res = response.data;
        if (res.status === 200) {
          this.userInfo = res.data;
        }
      })
      getCollection().then((response) => {
        let res = response.data;
        if (res.status === 200) {
          this.collectionList = res.data || [];
        }
      })
    }
  }
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
  @import "../../../style/mixin";

  #collection {
    width: 100%;
    min-height: 100vh;
    background: #fff;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;

    .scroll-container {
      width: 100%;
      min-height: calc(100vh - 50px);
      padding-bottom: 20px;
    }

    .empty-container {
      text-align: center;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      img {
        width: 3rem;
        height: 3rem;
      }
      .text {
        display: block;
        font-size: 0.35rem;
      }
      .tip {
        font-size: 0.3rem;
        color: #333;
        margin-top: 0.3rem;
      }
    }

    .userinfo {
      margin-top: 1rem;
      text-align: center;
      .avatar {
        img {
          @include px2rem(width, 150);
          @include px2rem(height, 150);
          border-radius: 50%;
        }
      }
      .username {
        font-size: 0.5rem;
      }
      .collection-count {
        font-size: 0.35rem;
      }
    }

    article {
      padding: 0.3rem;
      .title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.2rem 0;
        border-bottom: 1px solid $mtGrey;
        .restaurant-info {
          font-size: 0.4rem;
          display: flex;
          align-items: center;
          .icon {
            margin-right: 0.3rem;
            img {
              @include px2rem(width, 45);
              @include px2rem(height, 45);
            }
          }
          .name {
            font-size: 0.45rem;
            color: #666;
          }
        }
      }
      .main-container {
        display: flex;
        .avatar {
          margin: 0.3rem 0.5rem 0 0;
          img {
            @include px2rem(width, 80);
            @include px2rem(height, 80);
            border-radius: 8px;
            border: 1px solid #333;
          }
        }
        .info-container {
          flex: 1;
          .top {
            display: flex;
            justify-content: space-between;
            .name {
              font-size: 0.5rem;
            }
            .time {
              font-size: 0.3rem;
            }
          }
          .margin-2 {
            margin: 0.2rem 0;
          }
        }
        .score {
          color: #999;
          font-size: 0.35rem;
          .delivery {
            margin-left: 0.2rem;
          }
        }
        .bottom {
          border-top: 1px solid $mtGrey;
          text-align: right;
          .delete {
            font-size: 0.45rem;
            .iconfont {
              display: inline-block;
              font-size: 0.5rem;
              margin-right: 0.15rem;
            }
          }
        }
      }
    }
  }
</style>
