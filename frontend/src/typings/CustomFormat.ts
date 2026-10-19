import ModelBase from 'App/ModelBase';

// The parts of a v1 CustomFormatResource that lists of formats show.
interface CustomFormat extends ModelBase {
  name: string;
  includeCustomFormatWhenRenaming?: boolean;
}

export default CustomFormat;
