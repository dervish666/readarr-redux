using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using FluentValidation.Results;

namespace Readarr.Http.Validation
{
    // The API serializes FluentValidation's ValidationFailure directly. FluentValidation 10+ changed that
    // type's JSON in three ways this keeps API clients from seeing:
    //  - FormattedMessageArguments (always an empty array in 9.x) was removed;
    //  - a "PropertyPath" placeholder was added to FormattedMessagePlaceholderValues;
    //  - InclusiveBetween/ExclusiveBetween stopped adding a "Value" placeholder.
    // Messages, error codes, severities and property names are unaffected. Delete this once API clients
    // are known not to depend on those fields.
    public static class ValidationFailureJsonCompatibility
    {
        private const string PlaceholderValuesName = "formattedMessagePlaceholderValues";

        private static readonly HashSet<string> BetweenErrorCodes = new HashSet<string>
        {
            "InclusiveBetweenValidator",
            "ExclusiveBetweenValidator"
        };

        public static void Apply(JsonSerializerOptions options)
        {
            options.TypeInfoResolver = (options.TypeInfoResolver ?? new DefaultJsonTypeInfoResolver()).WithAddedModifier(Modify);
        }

        private static void Modify(JsonTypeInfo typeInfo)
        {
            if (typeInfo.Kind != JsonTypeInfoKind.Object || !typeof(ValidationFailure).IsAssignableFrom(typeInfo.Type))
            {
                return;
            }

            var placeholders = typeInfo.Properties.FirstOrDefault(p => p.Name == PlaceholderValuesName);

            if (placeholders == null)
            {
                return;
            }

            placeholders.Get = failure => ToLegacyPlaceholders((ValidationFailure)failure);

            var arguments = typeInfo.CreateJsonPropertyInfo(typeof(object[]), "formattedMessageArguments");
            arguments.Get = failure => ((ValidationFailure)failure).FormattedMessagePlaceholderValues == null ? null : Array.Empty<object>();

            typeInfo.Properties.Insert(typeInfo.Properties.IndexOf(placeholders), arguments);
        }

        private static Dictionary<string, object> ToLegacyPlaceholders(ValidationFailure failure)
        {
            var values = failure.FormattedMessagePlaceholderValues;

            if (values == null)
            {
                return null;
            }

            var legacy = new Dictionary<string, object>();
            var addValue = failure.ErrorCode != null && BetweenErrorCodes.Contains(failure.ErrorCode) && values.ContainsKey("PropertyValue");

            foreach (var (key, value) in values)
            {
                if (key == "PropertyPath")
                {
                    continue;
                }

                legacy[key] = value;

                if (addValue && key == "To")
                {
                    legacy["Value"] = values["PropertyValue"];
                }
            }

            return legacy;
        }
    }
}
