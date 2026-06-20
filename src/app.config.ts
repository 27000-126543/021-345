export default defineAppConfig({
  pages: [
    'pages/pileList/index',
    'pages/recordForm/index',
    'pages/dailyLog/index',
    'pages/mine/index',
    'pages/pileDetail/index',
    'pages/logDetail/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#1E88E5',
    navigationBarTitleText: '桩基施工记录',
    navigationBarTextStyle: 'white'
  },
  tabBar: {
    color: '#9CA3AF',
    selectedColor: '#1E88E5',
    backgroundColor: '#FFFFFF',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/pileList/index',
        text: '今日桩位'
      },
      {
        pagePath: 'pages/recordForm/index',
        text: '成孔记录'
      },
      {
        pagePath: 'pages/dailyLog/index',
        text: '施工日志'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的'
      }
    ]
  }
})
