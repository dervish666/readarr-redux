import ModelBase from 'App/ModelBase';
import { Quality } from 'Quality/Quality';

// Readarr v1 QualityDefinitionResource. Sizes are kilobits per minute of runtime.
interface QualityDefinition extends ModelBase {
  quality: Quality;
  title: string;
  weight: number;
  minSize: number | null;
  maxSize: number | null;
}

export default QualityDefinition;
