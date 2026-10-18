import ModelBase from 'App/ModelBase';
import Author from 'Author/Author';
import DownloadProtocol from 'DownloadClient/DownloadProtocol';
import { QualityModel } from 'Quality/Quality';
import CustomFormat from 'typings/CustomFormat';

// Readarr v1 BlocklistResource
interface Blocklist extends ModelBase {
  authorId: number;
  bookIds: number[];
  sourceTitle: string;
  quality: QualityModel;
  customFormats?: CustomFormat[];
  date: string;
  protocol: DownloadProtocol;
  indexer?: string;
  message?: string;
  author?: Author;
}

export default Blocklist;
