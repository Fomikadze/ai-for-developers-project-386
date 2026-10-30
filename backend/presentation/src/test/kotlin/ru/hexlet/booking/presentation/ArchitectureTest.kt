package ru.hexlet.booking.presentation

import com.tngtech.archunit.core.importer.ClassFileImporter
import com.tngtech.archunit.core.importer.ImportOption
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses
import kotlin.test.Test

class ArchitectureTest {
    private val classes =
        ClassFileImporter()
            .withImportOption(ImportOption.DoNotIncludeTests())
            .importPackages("ru.hexlet.booking")

    private fun layer(name: String) = "ru.hexlet.booking.$name.."

    @Test
    fun `domain depends on no other layer`() {
        noClasses()
            .that()
            .resideInAPackage(layer("domain"))
            .should()
            .dependOnClassesThat()
            .resideInAnyPackage(
                layer("application"),
                layer("infrastructure"),
                layer("presentation"),
            ).allowEmptyShould(true)
            .check(classes)
    }

    @Test
    fun `application depends only on domain`() {
        noClasses()
            .that()
            .resideInAPackage(layer("application"))
            .should()
            .dependOnClassesThat()
            .resideInAnyPackage(layer("infrastructure"), layer("presentation"))
            .allowEmptyShould(true)
            .check(classes)
    }

    @Test
    fun `infrastructure does not depend on presentation`() {
        noClasses()
            .that()
            .resideInAPackage(layer("infrastructure"))
            .should()
            .dependOnClassesThat()
            .resideInAPackage(layer("presentation"))
            .allowEmptyShould(true)
            .check(classes)
    }
}
