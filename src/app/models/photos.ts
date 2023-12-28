export interface Photos {
  id?: string;
  offenderID?: string;
  comments?: string;
  photos?: Array<PhotoTemplate>;
  photo1?: any;
}

export interface PhotoTemplate {
  photoDate?: string;
  photoUrl?: string;
  photoMain?: boolean;
  photoComment?: string;
  photoLat?: string;
  photoLon?: string;
}
