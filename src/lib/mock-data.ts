export interface Product {
  id: string
  name: string
  description: string
  fullDescription: string
  price: number
  imageUrl: string
  thumbnails: string[]
}

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Fone de Ouvido Noise Cancelling Pro',
    description: 'Áudio premium com cancelamento de ruído ativo.',
    fullDescription:
      'Experimente a verdadeira imersão sonora com nossos fones de ouvido de última geração. O cancelamento de ruído ativo bloqueia distrações enquanto os drivers de 40mm entregam graves profundos e agudos cristalinos. Bateria de longa duração para até 30 horas de reprodução contínua.',
    price: 899.9,
    imageUrl: 'https://img.usecurling.com/p/600/600?q=headphones&color=black',
    thumbnails: [
      'https://img.usecurling.com/p/150/150?q=headphones&color=black&dpr=1',
      'https://img.usecurling.com/p/150/150?q=headphones&color=black&dpr=2',
      'https://img.usecurling.com/p/150/150?q=headphones&color=black&dpr=3',
    ],
  },
  {
    id: '2',
    name: 'Smartwatch Elite Series 5',
    description: 'Monitoramento de saúde e estilo no seu pulso.',
    fullDescription:
      'O Smartwatch Elite Series 5 acompanha você em todos os momentos. Monitore seus batimentos cardíacos, qualidade do sono e acompanhe mais de 20 modalidades esportivas. Tela AMOLED vibrante com Always-on display e resistência à água 5ATM.',
    price: 1249.0,
    imageUrl: 'https://img.usecurling.com/p/600/600?q=smartwatch&color=black',
    thumbnails: [
      'https://img.usecurling.com/p/150/150?q=smartwatch&color=black&dpr=1',
      'https://img.usecurling.com/p/150/150?q=smartwatch&color=black&dpr=2',
      'https://img.usecurling.com/p/150/150?q=smartwatch&color=black&dpr=3',
    ],
  },
  {
    id: '3',
    name: 'Câmera Mirrorless 4K Creator',
    description: 'Perfeita para criadores de conteúdo e vloggers.',
    fullDescription:
      'Capture momentos em incrível resolução 4K. Design leve e compacto, foco automático ultra-rápido e tela articulada ideal para vlogs. Conectividade Wi-Fi e Bluetooth para transferência instantânea de fotos e vídeos para o seu smartphone.',
    price: 4599.0,
    imageUrl: 'https://img.usecurling.com/p/600/600?q=camera&color=black',
    thumbnails: [
      'https://img.usecurling.com/p/150/150?q=camera&color=black&dpr=1',
      'https://img.usecurling.com/p/150/150?q=camera&color=black&dpr=2',
      'https://img.usecurling.com/p/150/150?q=camera&color=black&dpr=3',
    ],
  },
  {
    id: '4',
    name: 'Mochila Tech Antifurto V2',
    description: 'Segurança e organização para o seu dia a dia.',
    fullDescription:
      'A Mochila Tech Antifurto V2 foi desenhada pensando na sua segurança. Zíperes embutidos, material resistente a cortes e porta USB externa para carregamento. Compartimentos acolchoados para notebook de até 15.6 polegadas e tablet.',
    price: 299.9,
    imageUrl: 'https://img.usecurling.com/p/600/600?q=backpack&color=gray',
    thumbnails: [
      'https://img.usecurling.com/p/150/150?q=backpack&color=gray&dpr=1',
      'https://img.usecurling.com/p/150/150?q=backpack&color=gray&dpr=2',
      'https://img.usecurling.com/p/150/150?q=backpack&color=gray&dpr=3',
    ],
  },
  {
    id: '5',
    name: 'Caixa de Som Portátil Bass+',
    description: "Som potente à prova d'água para qualquer aventura.",
    fullDescription:
      "Leve a festa para qualquer lugar com a Bass+. Som em 360 graus, graves impactantes e bateria para 15 horas de reprodução. Certificação IP67 (à prova d'água e poeira) e função de pareamento múltiplo para conectar duas ou mais caixas simultaneamente.",
    price: 549.0,
    imageUrl: 'https://img.usecurling.com/p/600/600?q=speaker&color=blue',
    thumbnails: [
      'https://img.usecurling.com/p/150/150?q=speaker&color=blue&dpr=1',
      'https://img.usecurling.com/p/150/150?q=speaker&color=blue&dpr=2',
      'https://img.usecurling.com/p/150/150?q=speaker&color=blue&dpr=3',
    ],
  },
]
