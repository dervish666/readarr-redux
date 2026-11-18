using FluentValidation;
using FluentValidation.Internal;
using FluentValidation.Validators;

namespace NzbDrone.Core.Validation
{
    // FluentValidation 10+ only offers PropertyValidator<T, TProperty>, which ties a validator to one
    // root type. Readarr injects a single validator instance into rules on several root types (for
    // example RootFolderValidator serves Author, AuthorResource, RootFolderResource and RTorrentSettings),
    // so custom validators derive from this root-agnostic base instead and the SetValidator extension
    // below wraps them in a PropertyValidator<T, TProperty> for each rule they are attached to.
    public abstract class NzbDronePropertyValidator
    {
        // FluentValidation 9 used the validator's type name as the error code, keep doing so.
        public virtual string Name => GetType().Name;

        protected abstract string GetDefaultMessageTemplate();

        protected abstract bool IsValid(PropertyValidatorContext context);

        internal string DefaultMessageTemplate => GetDefaultMessageTemplate();

        internal bool Validate(PropertyValidatorContext context)
        {
            return IsValid(context);
        }
    }

    public class PropertyValidatorContext
    {
        public PropertyValidatorContext(object propertyValue, object instanceToValidate, MessageFormatter messageFormatter)
        {
            PropertyValue = propertyValue;
            InstanceToValidate = instanceToValidate;
            MessageFormatter = messageFormatter;
        }

        public object PropertyValue { get; }

        public object InstanceToValidate { get; }

        public MessageFormatter MessageFormatter { get; }
    }

    public class NzbDronePropertyValidatorAdapter<T, TProperty> : PropertyValidator<T, TProperty>
    {
        public NzbDronePropertyValidatorAdapter(NzbDronePropertyValidator validator)
        {
            Validator = validator;
        }

        public NzbDronePropertyValidator Validator { get; }

        public override string Name => Validator.Name;

        public override bool IsValid(ValidationContext<T> context, TProperty value)
        {
            return Validator.Validate(new PropertyValidatorContext(value, context.InstanceToValidate, context.MessageFormatter));
        }

        protected override string GetDefaultMessageTemplate(string errorCode)
        {
            return Validator.DefaultMessageTemplate;
        }
    }

    public static class NzbDronePropertyValidatorExtensions
    {
        public static IRuleBuilderOptions<T, TProperty> SetValidator<T, TProperty>(this IRuleBuilder<T, TProperty> ruleBuilder, NzbDronePropertyValidator validator)
        {
            return ruleBuilder.SetValidator(new NzbDronePropertyValidatorAdapter<T, TProperty>(validator));
        }
    }
}
