<template>
  <div class="food-card">
    <!-- 排名角标 -->
    <div v-if="rank" class="rank-badge" :class="rankClass">No.{{ rank }}</div>

    <img v-if="food.pic_url" :src="food.pic_url" class="food-img" alt="">
    <div v-else class="food-img food-img--placeholder"></div>

    <div class="food-info">
      <div class="food-name">{{ food.food_name }}</div>
      <div class="food-desc" v-if="food.description">{{ food.description }}</div>

      <div class="food-meta">
        <span class="restaurant-name">{{ food.restaurant_name }}</span>
        <span class="month-sales" v-if="food.month_saled">月售 {{ food.month_saled }}</span>
      </div>

      <!-- 综合评分条（仅当有打分数据时展示）-->
      <div class="score-bar" v-if="food._scores">
        <span class="score-label">综合得分</span>
        <div class="score-track">
          <div class="score-fill" :style="{ width: food._scores.total + '%' }"></div>
        </div>
        <span class="score-value">{{ food._scores.total }}</span>
      </div>

      <div class="food-footer">
        <span class="food-price">￥{{ food.price }}</span>
        <button class="order-btn" @click="$emit('order', food)">立即下单</button>
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'FoodCard',
    props: {
      food: {
        type: Object,
        required: true
      },
      rank: {
        type: Number,
        default: null
      }
    },
    computed: {
      rankClass() {
        if (this.rank === 1) return 'rank-gold'
        if (this.rank === 2) return 'rank-silver'
        if (this.rank === 3) return 'rank-bronze'
        return ''
      }
    }
  }
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
  @import "../../../style/mixin.scss";

  .food-card {
    position: relative;
    display: flex;
    background: #fff;
    border-radius: 0.16rem;
    margin: 0.15rem 0.3rem;
    padding: 0.2rem;
    box-shadow: 0 0.02rem 0.12rem rgba(0,0,0,0.08);
    overflow: hidden;

    // 排名角标
    .rank-badge {
      position: absolute;
      top: 0;
      left: 0;
      padding: 0.05rem 0.16rem;
      font-size: 0.24rem;
      font-weight: bold;
      color: #fff;
      border-bottom-right-radius: 0.12rem;
      background: #bbb;
      z-index: 1;

      &.rank-gold   { background: #f5a623; }
      &.rank-silver { background: #9b9b9b; }
      &.rank-bronze { background: #c47a3a; }
    }

    .food-img {
      @include px2rem(width, 120);
      @include px2rem(height, 120);
      object-fit: cover;
      border-radius: 0.1rem;
      flex-shrink: 0;

      &--placeholder {
        background: $mtGrey;
      }
    }

    .food-info {
      flex: 1;
      margin-left: 0.2rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;

      .food-name {
        font-size: 0.36rem;
        font-weight: bold;
        color: #222;
        @include ellipsis;
        // 为角标留空间
        padding-left: 0.6rem;
      }

      .food-desc {
        font-size: 0.26rem;
        color: #999;
        margin-top: 0.06rem;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      .food-meta {
        font-size: 0.26rem;
        color: #999;
        margin-top: 0.06rem;

        .restaurant-name {
          margin-right: 0.2rem;
        }
      }

      // 综合评分进度条
      .score-bar {
        display: flex;
        align-items: center;
        margin-top: 0.08rem;
        gap: 0.1rem;

        .score-label {
          font-size: 0.24rem;
          color: #bbb;
          white-space: nowrap;
        }

        .score-track {
          flex: 1;
          height: 0.1rem;
          background: #f0f0f0;
          border-radius: 0.1rem;
          overflow: hidden;

          .score-fill {
            height: 100%;
            background: linear-gradient(to right, $mtYellow, #ff9500);
            border-radius: 0.1rem;
            transition: width 0.4s ease;
          }
        }

        .score-value {
          font-size: 0.26rem;
          font-weight: bold;
          color: #f5a623;
          white-space: nowrap;
          min-width: 0.4rem;
        }
      }

      .food-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 0.1rem;

        .food-price {
          font-size: 0.42rem;
          font-weight: bold;
          color: #fb4e44;
        }

        .order-btn {
          background: $mtYellow;
          border: none;
          border-radius: 0.3rem;
          padding: 0.1rem 0.3rem;
          font-size: 0.3rem;
          font-weight: bold;
          color: #333;
          cursor: pointer;
          outline: none;

          &:active {
            opacity: 0.8;
          }
        }
      }
    }
  }
</style>
