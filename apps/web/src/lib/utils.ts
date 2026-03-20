export const guessLayer = (name: string, type: string) => {
  const n = name.toLowerCase();
  
  if (n.includes('backend') || n.includes('api') || n.includes('server') || n.includes('node') || n.includes('go-') || n.includes('eng-') || n.includes('dev-') || n.includes('worker') || n.includes('service')) return 'backend';
  
  if (n.includes('web') || n.includes('front') || n.includes('react') || n.includes('ui') || n.includes('dashboard') || n.includes('app-') || n.includes('design') || n.includes('ux-') || n.includes('landing') || n.includes('site') || n.includes('client')) return 'web';
  
  if (n.includes('mobile') || n.includes('ios') || n.includes('android') || n.includes('swift') || n.includes('kotlin') || n.includes('flutter') || n.includes('app') || n.includes('native')) return 'mobile';
  
  if (n.includes('infra') || n.includes('cloud') || n.includes('ops') || n.includes('devops') || n.includes('terraform') || n.includes('deploy') || n.includes('k8s') || n.includes('docker') || n.includes('aws') || n.includes('yaml')) return 'infrastructure';
  
  if (n.includes('ai-') || n.includes('llm') || n.includes('ml-') || n.includes('model') || n.includes('bot') || n.includes('gpt') || n.includes('embed') || n.includes('pytorch') || n.includes('tensorflow') || n.includes('training')) return 'ai';
  
  if (n.includes('blockchain') || n.includes('.sol') || n.includes('solidity') || n.includes('foundry') || n.includes('hardhat') || n.includes('smart-contract')) return 'blockchain';
  
  if (n.includes('lambda') || n.includes('serverless') || n.includes('cloud-function')) return 'lambda';
  
  if (n.includes('crawler') || n.includes('scraper') || n.includes('spider')) return 'crawler';
  
  if (n.includes('database') || n.includes('sql') || n.includes('postgres') || n.includes('mysql') || n.includes('mongodb') || n.includes('migration') || n.includes('schema') || n.includes('db')) return 'database';
  
  if (n.includes('qa') || n.includes('bug') || n.includes('test') || n.includes('e2e') || n.includes('playwright') || n.includes('cypress')) return 'qa';
  
  if (n.includes('security') || n.includes('audit') || n.includes('compliance') || n.includes('vault') || n.includes('policy')) return 'security';
  
  if (n.includes('shared') || n.includes('core') || n.includes('utils') || n.includes('lib') || n.includes('common')) return 'shared';
  
  if (n.includes('doc') || n.includes('wiki') || n.includes('general') || n.includes('handbook') || n.includes('report') || n.includes('analysis') || n.includes('spec')) return 'docs';

  return 'docs';
};
