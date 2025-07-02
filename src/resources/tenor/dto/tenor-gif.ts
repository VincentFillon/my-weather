export interface TenorGif {
  id: string;
  title: string;
  media_formats: {
    gif: {
      url: string;
      dims: number[];
      duration: number;
      preview: string;
      size: number;
    };
    mediumgif?: { // Rendre optionnel si pas toujours présent
      url: string;
      dims: number[];
      duration: number;
      preview: string;
      size: number;
    };
    tinygif?: { // Rendre optionnel si pas toujours présent
      url: string;
      dims: number[];
      duration: number;
      preview: string;
      size: number;
    };
  };
}