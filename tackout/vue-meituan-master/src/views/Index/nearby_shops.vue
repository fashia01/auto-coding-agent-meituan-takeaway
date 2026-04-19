<!--附近商家组件-->
<template>
  <div class="nearby-shops">
    <nav ref="nav">
      <ul>
        <li>综合排序 <i class="iconfont icon-sort">&#xe601;</i></li>
        <li>销量最高</li>
        <li>距离最近</li>
        <li>筛选</li>
      </ul>
    </nav>

    <!--商家列表-->
    <article>
      <section
        v-for="item in shopLists"
        :key="item.id"
        :class="['shop-item', { 'shop-item--unreachable': !item.deliverable }]"
        @click="goToStore(item)">

        <!-- 商家图片 + 超范围蒙层 -->
        <div class="img-show">
          <img :src="item.pic_url">
          <div v-if="!item.deliverable" class="unreachable-mask">
            <span class="unreachable-icon">🚫</span>
            <span class="unreachable-text">超出配送范围</span>
          </div>
        </div>

        <!-- 商家信息 -->
        <div class="detail">
          <h4>
            {{ item.name }}
            <span v-if="!item.deliverable" class="unreachable-tag">暂不配送</span>
          </h4>

          <div class="shops-message">
            <v-star :score="item.wm_poi_score"></v-star>
            <span class="sell-num">{{ item.month_sales_tip }}</span>
            <div class="delivery-info">
              <span class="deliver-time" :class="{ 'deliver-time--far': !item.deliverable }">
                {{ item.delivery_time_tip }}/
              </span>
              <span class="distance" :class="{ 'distance--far': !item.deliverable }">
                {{ item.distance }}
              </span>
            </div>
          </div>

          <!-- 超范围：展示距离提示；正常：展示价格信息 -->
          <div class="price-message">
            <template v-if="!item.deliverable">
              <span class="out-of-range-tip">
                📍 距您约 {{ item.distance }}，超出 30km 配送范围
              </span>
            </template>
            <template v-else>
              <span>{{ item.min_price_tip }} | </span>
              <span>{{ item.shipping_fee_tip }} | </span>
              <span>{{ item.average_price_tip }}</span>
            </template>
          </div>

          <!-- 优惠活动（仅可配送店铺显示）-->
          <div class="active-message" v-if="item.deliverable && item.discounts2 && item.discounts2.length">
            <ul>
              <li v-for="(discount, index) in item.discounts2.slice(0, 1)" :key="index">
                <div class="discount-left">
                  <img :src="discount.icon_url" class="icon">
                  <span class="info">{{ discount.info }}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </article>

    <!--加载更多-->
    <div class="loading-wrap" ref="loading">
      <span class="loading" v-show="loading && !noMore">正在努力加载中…</span>
      <span class="no-more" v-show="noMore">已经到底了</span>
    </div>

    <!--超范围提示弹窗-->
    <alert-tip :text="tipText" :showTip.sync="showTip"></alert-tip>
  </div>
</template>

<script>
  import BScroll from 'better-scroll'
  import {getRestaurants} from '@/api/restaurant'
  import {mapGetters} from 'vuex'

  export default {
    data() {
      return {
        shopLists: [],
        showSort: false,
        BScrollEvent: null,
        loading: false,
        page: 1,
        limit: 4,
        noMore: false,
        preventRepeat: false,
        tipText: '',
        showTip: false
      }
    },
    computed: {
      ...mapGetters(['address'])
    },
    props: ['scrollWrapper'],
    methods: {
      // 点击餐馆：超出配送范围时弹提示，否则跳转店铺页
      goToStore(item) {
        if (!item.deliverable) {
          this.tipText = `该店铺距您约 ${item.distance}，已超出 30km 配送范围，暂时无法配送`;
          this.showTip = true;
          return;
        }
        this.$router.push({ path: 'store', query: { id: item.id } });
      },

      // 监听滚动，到底加载更多
      listenScroll() {
        let _this = this;
        _this.BScrollEvent.on('scroll', function (obj) {
          if (Math.abs(obj.y) + _this.scrollWrapper.clientHeight >= _this.scrollWrapper.childNodes[0].clientHeight - 30) {
            if (!_this.loading) {
              _this.loading = true;
              _this.getRestaurants(_this.page, _this.limit, function (data) {
                _this.page++;
                data.forEach((el) => { _this.shopLists.push(el); });
                _this.$nextTick(() => {
                  _this.loading = false;
                  _this.BScrollEvent.refresh();
                });
              });
            }
          }
        });
      },

      getRestaurants(page, limit, callback) {
        if (this.noMore || this.preventRepeat) return;
        this.preventRepeat = true;
        let offset = (page - 1) * limit;
        let {lat, lng} = this.address;
        getRestaurants({offset, limit, lng, lat}).then((response) => {
          let data = response.data.data;
          this.preventRepeat = false;
          this.noMore = data.length < this.limit;
          callback(data);
        });
      },

      firstFetch() {
        let _this = this;
        this.page = 1;
        this.getRestaurants(this.page, this.limit, function (data) {
          _this.page++;
          _this.shopLists = data;
          _this.$nextTick(() => {
            _this.BScrollEvent = new BScroll(_this.scrollWrapper, {click: true, probeType: 2});
            _this.listenScroll();
          });
        });
      }
    },
    created() {
      let {lat, lng} = this.address;
      if (lat && lng) {
        this.shopLists = [];
        this.firstFetch();
      } else {
        this.$store.dispatch('location');
      }
    },
    watch: {
      address(value) {
        this.noMore = false;
        this.preventRepeat = false;
        let {lat, lng} = value;
        if (lat && lng) {
          this.shopLists = [];
          this.firstFetch();
        }
      }
    }
  }
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
  @import "../../style/mixin.scss";

  .nearby-shops {
    margin: 0.1rem 0;

    nav {
      border-bottom: 1px solid $bottomLine;
      position: relative;
      @include px2rem(line-height, 80);
      ul {
        display: flex;
        li {
          font-size: 0.4rem;
          text-align: center;
          padding: 0 0.1rem;
          flex: 1;
          .icon-sort {
            display: inline-block;
            @include px2rem(width, 20);
            font-size: 0.3rem;
          }
        }
      }
    }

    article {
      position: relative;

      // 单个商家卡片
      .shop-item {
        display: flex;
        padding: 0.3rem 0;
        margin: 0 0.2rem;
        border-bottom: 1px solid $mtGrey;
        cursor: pointer;
        transition: opacity 0.2s;

        &:active {
          opacity: 0.85;
        }

        // 超出配送范围：整体轻度灰化
        &--unreachable {
          opacity: 0.75;
          cursor: not-allowed;

          &:active {
            opacity: 0.75;
          }
        }
      }

      .img-show {
        position: relative;
        @include px2rem(width, 170);
        @include px2rem(height, 130);
        margin-right: 0.2rem;
        border: 1px solid $mtGrey;
        flex-shrink: 0;
        overflow: hidden;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        // 超出范围蒙层（覆盖在图片上）
        .unreachable-mask {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.06rem;

          .unreachable-icon {
            font-size: 0.5rem;
            line-height: 1;
          }

          .unreachable-text {
            font-size: 0.24rem;
            color: #fff;
            font-weight: bold;
            white-space: nowrap;
          }
        }
      }

      .detail {
        flex: 1;
        min-width: 0;

        h4 {
          font-size: 0.45rem;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 0.15rem;

          // "暂不配送"角标
          .unreachable-tag {
            display: inline-block;
            font-size: 0.22rem;
            font-weight: normal;
            color: #fff;
            background: #bbb;
            border-radius: 0.08rem;
            padding: 0.02rem 0.12rem;
            vertical-align: middle;
            white-space: nowrap;
          }
        }

        .shops-message {
          display: flex;
          margin-top: 0.3rem;
          align-items: center;

          span {
            display: inline-block;
            vertical-align: bottom;
            font-size: 0.3rem;
          }

          .sell-num {
            flex: 1;
          }

          .delivery-info {
            display: flex;
            align-items: center;
          }

          // 超范围：配送时间和距离标红
          .deliver-time--far,
          .distance--far {
            color: #bbb;
          }
        }

        .price-message {
          margin: 0.2rem 0;
          display: flex;
          align-items: center;
          flex-wrap: wrap;

          span {
            font-size: 0.2rem;
          }

          // 超出范围提示文字
          .out-of-range-tip {
            font-size: 0.26rem;
            color: #bbb;
          }
        }

        .active-message {
          ul li {
            display: flex;
            justify-content: space-between;
            align-items: center;

            .discount-left {
              display: flex;
              margin: 0.1rem 0;
              align-items: center;

              .info {
                color: #777272;
                font-size: 0.3rem;
                display: inline-block;
                @include px2rem(width, 360);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }

              .icon {
                margin-right: 0.15rem;
                display: inline-block;
                @include px2rem(width, 34);
                @include px2rem(height, 34);
              }
            }
          }
        }
      }
    }

    .loading-wrap {
      @include loading;
    }
  }

  .fade-enter-active, .fade-leave-active {
    transition: opacity 0.5s;
  }

  .fade-enter, .fade-leave {
    opacity: 0;
  }
</style>
