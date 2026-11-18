using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using FluentValidation;
using Readarr.Http.ClientSchema;

namespace Readarr.Http.REST
{
    public class ResourceValidator<TResource> : AbstractValidator<TResource>
    {
        public IRuleBuilderInitial<TResource, TProperty> RuleForField<TProperty>(Expression<Func<TResource, IEnumerable<Field>>> fieldListAccessor, string fieldName)
        {
            var accessor = fieldListAccessor.Compile();

            // The field value is not a member access, so name the rule after the field explicitly,
            // as the FluentValidation 9 PropertyRule construction did.
            return RuleFor(c => GetValue<TProperty>(c, accessor, fieldName))
                .Configure(rule =>
                {
                    rule.PropertyName = fieldName;
                    rule.SetDisplayName(fieldName);
                    rule.CascadeMode = CascadeMode.Continue;
                });
        }

        private static TProperty GetValue<TProperty>(TResource container, Func<TResource, IEnumerable<Field>> fieldListAccessor, string fieldName)
        {
            var resource = fieldListAccessor(container).SingleOrDefault(c => c.Name == fieldName);

            return resource?.Value is TProperty value ? value : default;
        }
    }
}
