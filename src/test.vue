<template lang="pug">
.app-container
  // Header Component Usage
  header.header
    .header__container
      a.header__brand(href="/")
        i.header__brand-icon.icon-logo
        | BEM Navigator
      nav.header__nav
        ul.header__nav-list
          li.header__nav-item.header__nav-item--active
            a.header__nav-link(href="#") Dashboard
          li.header__nav-item
            a.header__nav-link(href="#") Projects
          li.header__nav-item
            a.header__nav-link(href="#") Team
      .header__actions
        button.header__actions-button Login
        button.header__actions-button.header__actions-button--primary Sign Up

  // Main Layout
  .layout-wrapper
    // Sidebar Component Usage
    aside.sidebar
      .sidebar__section
        h3.sidebar__section-title Main Menu
        ul.sidebar__menu
          li.sidebar__menu-item.sidebar__menu-item--active
            a.sidebar__menu-link(href="#")
              i.sidebar__menu-link-icon.icon-home
              span.sidebar__menu-link-text Overview
          li.sidebar__menu-item
            a.sidebar__menu-link(href="#")
              i.sidebar__menu-link-icon.icon-chart
              span.sidebar__menu-link-text Analytics
              span.sidebar__menu-link-badge 3
      .sidebar__section
        h3.sidebar__section-title Settings
        ul.sidebar__menu
          li.sidebar__menu-item
            a.sidebar__menu-link(href="#")
              i.sidebar__menu-link-icon.icon-user
              span.sidebar__menu-link-text Profile
          li.sidebar__menu-item
            a.sidebar__menu-link(href="#")
              i.sidebar__menu-link-icon.icon-settings
              span.sidebar__menu-link-text Preferences

    // Main Content Area
    main.main-content
      .dashboard-grid
        // Widget 1: Stats
        .widget.widget--highlight
          .widget__header
            h2.widget__title Daily Stats
            .widget__controls
              button.btn-icon.btn-icon--sm
                i.icon-refresh
          .widget__body
            .stats-card
              .stats-card__value 1,234
              .stats-card__label Total Visits
              .stats-card__trend.stats-card__trend--up +12%
            .stats-card
              .stats-card__value 85%
              .stats-card__label Bounce Rate
              .stats-card__trend.stats-card__trend--down -2%

        // Widget 2: User List
        .widget
          .widget__header
            h2.widget__title Recent Users
          .widget__body
            ul.user-list
              li.user-list__item
                img.user-list__avatar(src="user1.jpg")
                .user-list__info
                  .user-list__name John Doe
                  .user-list__role Admin
                .user-list__status.user-list__status--online
              li.user-list__item
                img.user-list__avatar(src="user2.jpg")
                .user-list__info
                  .user-list__name Jane Smith
                  .user-list__role Editor
                .user-list__status.user-list__status--offline

        // Widget 3: Complex Form
        .widget.widget--large
          .widget__header
            h2.widget__title New Project
          .widget__body
            form.form
              .form__group
                label.form__label(for="p-name") Project Name
                input.form__input#p-name(type="text" placeholder="Enter name")
                span.form__hint Name must be unique
              
              .form__row
                .form__group.form__group--half
                  label.form__label(for="p-type") Type
                  select.form__select#p-type
                    option Web
                    option Mobile
                .form__group.form__group--half
                  label.form__label(for="p-date") Due Date
                  input.form__input#p-date(type="date")

              .form__group
                label.form__label Description
                textarea.form__textarea(rows="4")
              
              .form__actions
                button.btn.btn--secondary Cancel
                button.btn.btn--primary.btn--loading
                  span.btn__text Create Project
                  span.btn__spinner

  // Footer Component Usage
  footer.footer
    .footer__container
      .footer__grid
        .footer__column
          h4.footer__column-title Company
          ul.footer__column-list
            li.footer__column-item: a.footer__column-link(href="#") About Us
            li.footer__column-item: a.footer__column-link(href="#") Careers
        .footer__column
          h4.footer__column-title Resources
          ul.footer__column-list
            li.footer__column-item: a.footer__column-link(href="#") Blog
            li.footer__column-item: a.footer__column-link(href="#") Documentation
        .footer__column
          h4.footer__column-title Legal
          ul.footer__column-list
            li.footer__column-item: a.footer__column-link(href="#") Privacy
            li.footer__column-item: a.footer__column-link(href="#") Terms
        .footer__column
          h4.footer__column-title Connect
          .footer__bottom-social
            a.footer__bottom-social-link(href="#") Twitter
            a.footer__bottom-social-link(href="#") GitHub
      .footer__bottom
        .footer__bottom-copyright © 2024 BEM Navigator. All rights reserved.
</template>

<script>
export default {
  name: 'TestPage',
  data() {
    return {
      loading: false
    }
  }
}
</script>

<style lang="stylus">
@import './styles/external.styl'

// Layout Styles
.app-container
  min-height 100vh
  display flex
  flex-direction column

.layout-wrapper
  display flex
  flex 1
  padding-top 64px // Header height

.main-content
  margin-left 240px // Sidebar width
  flex 1
  padding 30px
  background-color #f4f6f9
  min-height calc(100vh - 64px)

.dashboard-grid
  display grid
  grid-template-columns repeat(auto-fit, minmax(350px, 1fr))
  gap 24px
  margin-bottom 30px

// Widget Block
.widget
  background white
  border-radius 8px
  box-shadow 0 1px 3px rgba(0,0,0,0.1)
  display flex
  flex-direction column
  transition transform 0.2s, box-shadow 0.2s
  
  &:hover
    box-shadow 0 4px 6px rgba(0,0,0,0.1)
    
  &--highlight
    border-top 4px solid $color-primary
    
  &--large
    grid-column span 2
    @media (max-width: 1024px)
      grid-column span 1

  &__header
    padding 20px
    border-bottom 1px solid #eee
    display flex
    justify-content space-between
    align-items center
    
  &__title
    margin 0
    font-size 16px
    font-weight 600
    color $color-dark
    
  &__controls
    display flex
    gap 8px
    
  &__body
    padding 20px
    flex 1

// Stats Card Block
.stats-card
  padding 15px
  background #f8f9fa
  border-radius 6px
  margin-bottom 15px
  display flex
  align-items center
  justify-content space-between
  
  &:last-child
    margin-bottom 0
    
  &__value
    font-size 24px
    font-weight bold
    color $color-dark
    
  &__label
    font-size 13px
    color $color-secondary
    margin-top 4px
    
  &__trend
    font-size 12px
    font-weight bold
    padding 4px 8px
    border-radius 12px
    
    &--up
      color $color-success
      background-color rgba(40, 167, 69, 0.1)
      
    &--down
      color $color-danger
      background-color rgba(220, 53, 69, 0.1)

// User List Block
.user-list
  list-style none
  padding 0
  margin 0
  
  &__item
    display flex
    align-items center
    padding 12px 0
    border-bottom 1px solid #f1f1f1
    
    &:last-child
      border-bottom none
      
  &__avatar
    width 40px
    height 40px
    border-radius 50%
    object-fit cover
    margin-right 15px
    
  &__info
    flex 1
    
  &__name
    font-size 14px
    font-weight 600
    color $color-dark
    
  &__role
    font-size 12px
    color $color-secondary
    margin-top 2px
    
  &__status
    width 10px
    height 10px
    border-radius 50%
    border 2px solid white
    box-shadow 0 0 0 1px #eee
    
    &--online
      background-color $color-success
      
    &--offline
      background-color $color-secondary

// Form Block
.form
  &__group
    margin-bottom 20px
    
    &--half
      width calc(50% - 10px)
      
  &__row
    display flex
    justify-content space-between
    flex-wrap wrap
    
  &__label
    display block
    margin-bottom 8px
    font-size 13px
    font-weight 500
    color $color-dark
    
  &__input,
  &__select,
  &__textarea
    width 100%
    padding 10px 12px
    border 1px solid #ced4da
    border-radius 4px
    font-size 14px
    transition border-color 0.2s
    
    &:focus
      outline none
      border-color $color-primary
      box-shadow 0 0 0 3px rgba(0,123,255,0.1)
      
  &__textarea
    resize vertical
    min-height 100px
    
  &__hint
    display block
    margin-top 5px
    font-size 12px
    color $color-secondary
    
  &__actions
    display flex
    justify-content flex-end
    gap 12px
    margin-top 30px
    padding-top 20px
    border-top 1px solid #eee

// Button Block
.btn
  display inline-flex
  align-items center
  justify-content center
  padding 10px 20px
  border-radius 4px
  border none
  font-size 14px
  font-weight 500
  cursor pointer
  transition all 0.2s
  position relative
  overflow hidden
  
  &--primary
    background-color $color-primary
    color white
    &:hover
      background-color darken($color-primary, 10%)
      
  &--secondary
    background-color $color-secondary
    color white
    &:hover
      background-color darken($color-secondary, 10%)
      
  &--loading
    color transparent
    pointer-events none
    
    .btn__spinner
      display block
      
  &__text
    z-index 1
    
  &__spinner
    display none
    position absolute
    left 50%
    top 50%
    width 16px
    height 16px
    margin-left -8px
    margin-top -8px
    border 2px solid white
    border-top-color transparent
    border-radius 50%
    animation spin 1s linear infinite

@keyframes spin
  to { transform: rotate(360deg) }

// Icon Button
.btn-icon
  width 32px
  height 32px
  display flex
  align-items center
  justify-content center
  border-radius 4px
  border 1px solid #dee2e6
  background white
  color $color-secondary
  cursor pointer
  transition all 0.2s
  
  &:hover
    background-color #f8f9fa
    color $color-primary
    border-color $color-primary
    
  &--sm
    width 28px
    height 28px
    font-size 12px

// Filler styles to ensure length and test deep nesting
.filler-styles
  &__level-1
    padding 10px
    &__level-2
      margin 10px
      &__level-3
        border 1px solid red
        &__level-4
          background blue
          &--modifier
            color white
            
  &__grid-test
    display grid
    &--col-2
      grid-template-columns 1fr 1fr
    &--col-3
      grid-template-columns 1fr 1fr 1fr
      
  &__flex-test
    display flex
    &--row
      flex-direction row
    &--col
      flex-direction column
      
  &__theme
    &-dark
      background black
      color white
    &-light
      background white
      color black
      
  &__animation
    &-fade
      transition opacity 0.3s
    &-slide
      transition transform 0.3s
      
  &__state
    &-active
      display block
    &-hidden
      display none
    &-disabled
      opacity 0.5
      pointer-events none
</style>