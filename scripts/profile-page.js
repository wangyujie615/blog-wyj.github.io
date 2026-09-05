'use strict';

hexo.extend.generator.register('personal-profile-page', function profilePage() {
  return {
    path: 'about/index.html',
    layout: ['profile', 'page'],
    data: {
      title: '关于我'
    }
  };
});
