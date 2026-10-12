using System;
using System.Diagnostics.CodeAnalysis;
using System.Linq.Expressions;
using Dapper;

namespace NzbDrone.Core.Datastore
{
    public abstract class WhereBuilder : ExpressionVisitor
    {
        public DynamicParameters Parameters { get; protected set; }

        // C# 14 binds array.Contains(x) to MemoryExtensions.Contains through an implicit Span conversion,
        // so the expression tree carries an op_Implicit call around the array. Unwrap it to reach the array.
        protected static bool TryUnwrapSpanImplicitCast(Expression expression, [NotNullWhen(true)] out Expression result)
        {
            if (expression is MethodCallExpression { Method: { Name: "op_Implicit", DeclaringType: { IsGenericType: true } implicitCastDeclaringType }, Arguments.Count: 1 } implicitCast
                && implicitCastDeclaringType.GetGenericTypeDefinition() is var genericTypeDefinition
                && (genericTypeDefinition == typeof(Span<>) || genericTypeDefinition == typeof(ReadOnlySpan<>)))
            {
                result = implicitCast.Arguments[0];
                return true;
            }

            result = null;
            return false;
        }
    }
}
